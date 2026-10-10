import { Injectable, NotFoundException } from "@nestjs/common";
import { formatDbDate } from "../common/dates";
import { paidTotal, rupees } from "../common/money";
import { studentWhere, visibleStudentIds } from "../common/scope";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const enrolmentInclude = {
  grade: true,
  section: true,
  academicYear: true,
} as const;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const ids = await visibleStudentIds(this.prisma, user);
    const students = await this.prisma.student.findMany({
      where: studentWhere(user, ids),
      include: {
        enrolments: {
          where: { academicYear: { status: "Active" } },
          include: enrolmentInclude,
        },
      },
      orderBy: { fullName: "asc" },
    });

    return students.map((student) => {
      const enrolment = student.enrolments[0];
      return {
        id: student.id,
        admissionNo: student.admissionNo,
        fullName: student.fullName,
        status: student.status,
        grade: enrolment?.grade.name ?? null,
        section: enrolment?.section.name ?? null,
        rollNo: enrolment?.rollNo ?? null,
      };
    });
  }

  async get(user: AuthUser, id: string) {
    const ids = await visibleStudentIds(this.prisma, user);
    const student = await this.prisma.student.findFirst({
      where: { ...studentWhere(user, ids), id },
      include: {
        campus: true,
        guardians: { include: { guardian: true } },
        enrolments: {
          where: { academicYear: { status: "Active" } },
          include: enrolmentInclude,
        },
        attendance: { orderBy: { date: "desc" }, take: 14 },
        invoices: {
          include: { payments: true, feePlan: true },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const enrolment = student.enrolments[0];
    return {
      id: student.id,
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      dateOfBirth: formatDbDate(student.dateOfBirth),
      gender: student.gender,
      status: student.status,
      campus: student.campus.name,
      grade: enrolment?.grade.name ?? null,
      section: enrolment?.section.name ?? null,
      rollNo: enrolment?.rollNo ?? null,
      academicYear: enrolment?.academicYear.name ?? null,
      guardians: student.guardians.map((link) => ({
        name: link.guardian.name,
        relation: link.relation,
        mobile: link.guardian.mobile,
        email: link.guardian.email,
        isPrimary: link.isPrimary,
        hasPortal: Boolean(link.guardian.userId),
      })),
      attendance: student.attendance.map((record) => ({
        date: formatDbDate(record.date),
        status: record.status,
        remarks: record.remarks,
      })),
      invoices:
        user.role === "TEACHER"
          ? []
          : student.invoices.map((invoice) => {
              const paid = paidTotal(invoice.payments);
              const amount = rupees(invoice.amount);
              const paidAmount = rupees(paid);
              return {
                id: invoice.id,
                invoiceNo: invoice.invoiceNo,
                planName: invoice.feePlan.name,
                amount,
                paid: paidAmount,
                balance: amount - paidAmount,
                dueDate: formatDbDate(invoice.dueDate),
                status: invoice.status,
              };
            }),
    };
  }
}
