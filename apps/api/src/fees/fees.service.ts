import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InvoiceStatus, PaymentMode, Prisma } from "@prisma/client";
import { PaymentInput } from "@school/shared";
import { asDbDate, formatDbDate, localDate } from "../common/dates";
import { paidTotal, rupees } from "../common/money";
import { visibleStudentIds } from "../common/scope";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    if (user.role === "TEACHER") {
      throw new ForbiddenException("Teachers do not open fee accounts");
    }
    const ids = await visibleStudentIds(this.prisma, user);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
        ...(ids === "all" ? {} : { studentId: { in: ids } }),
      },
      include: {
        payments: { orderBy: { paidAt: "asc" } },
        student: true,
        feePlan: true,
      },
      orderBy: [{ dueDate: "asc" }, { invoiceNo: "asc" }],
    });
    const today = localDate();
    return invoices.map((invoice) => this.present(invoice, today));
  }

  async recordPayment(user: AuthUser, invoiceId: string, input: PaymentInput, idempotencyKey?: string) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Only the office can record a counter payment");
    }

    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { invoice: { include: { payments: true, student: true, feePlan: true } } },
      });
      if (existing) {
        return this.present(existing.invoice, localDate());
      }
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const alreadyPaid = paidTotal(invoice.payments);
    const balance = invoice.amount.minus(alreadyPaid);
    const amount = new Prisma.Decimal(input.amount.toFixed(2));
    if (amount.greaterThan(balance)) {
      throw new BadRequestException("Amount is above the balance still due");
    }

    const receiptNo = await this.nextReceiptNo(invoice.campusId);
    const nextPaid = alreadyPaid.plus(amount);
    const status: InvoiceStatus = nextPaid.greaterThanOrEqualTo(invoice.amount)
      ? InvoiceStatus.PAID
      : InvoiceStatus.PARTLY_PAID;

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          tenantId: invoice.tenantId,
          campusId: invoice.campusId,
          invoiceId: invoice.id,
          amount,
          mode: input.mode as PaymentMode,
          receiptNo,
          idempotencyKey: idempotencyKey || null,
          recordedById: user.id,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status },
      }),
    ]);

    const updated = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { payments: { orderBy: { paidAt: "asc" } }, student: true, feePlan: true },
    });
    return this.present(updated, localDate());
  }

  private async nextReceiptNo(campusId: string) {
    const count = await this.prisma.payment.count({ where: { campusId } });
    return `RCP-${String(count + 1).padStart(4, "0")}`;
  }

  private present(
    invoice: {
      id: string;
      invoiceNo: string;
      amount: Prisma.Decimal;
      dueDate: Date;
      status: InvoiceStatus;
      student: { id: string; fullName: string; admissionNo: string };
      feePlan: { name: string };
      payments: { id: string; amount: Prisma.Decimal; mode: PaymentMode; receiptNo: string; paidAt: Date }[];
    },
    today: string,
  ) {
    const paid = rupees(paidTotal(invoice.payments));
    const amount = rupees(invoice.amount);
    const balance = amount - paid;
    return {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      studentId: invoice.student.id,
      studentName: invoice.student.fullName,
      admissionNo: invoice.student.admissionNo,
      planName: invoice.feePlan.name,
      amount,
      paid,
      balance,
      dueDate: formatDbDate(invoice.dueDate),
      overdue: balance > 0 && formatDbDate(invoice.dueDate) < today,
      status: invoice.status,
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: rupees(payment.amount),
        mode: payment.mode,
        receiptNo: payment.receiptNo,
        paidAt: payment.paidAt.toISOString(),
      })),
    };
  }

  async issueTuitionInvoice(
    db: Prisma.TransactionClient,
    input: {
      tenantId: string;
      campusId: string;
      legalEntityId: string;
      studentId: string;
      gradeId: string;
      academicYearId: string;
    },
  ) {
    const plan = await db.feePlan.findFirst({
      where: {
        tenantId: input.tenantId,
        gradeId: input.gradeId,
        academicYearId: input.academicYearId,
      },
    });
    if (!plan) {
      throw new BadRequestException("This grade has no tuition plan yet");
    }
    const count = await db.invoice.count({ where: { legalEntityId: input.legalEntityId } });
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueIso = localDate(30);
    return db.invoice.create({
      data: {
        tenantId: input.tenantId,
        campusId: input.campusId,
        legalEntityId: input.legalEntityId,
        studentId: input.studentId,
        feePlanId: plan.id,
        invoiceNo: `INV-${due.getFullYear()}-${String(count + 1).padStart(4, "0")}`,
        amount: plan.amount,
        dueDate: asDbDate(dueIso),
        status: InvoiceStatus.ISSUED,
      },
    });
  }
}
