import { Injectable } from "@nestjs/common";
import { localDate } from "../common/dates";
import { paidTotal, rupees } from "../common/money";
import { visibleStudentIds } from "../common/scope";
import { asDbDate } from "../common/dates";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async home(user: AuthUser) {
    const today = localDate();
    const campus = await this.prisma.campus.findFirst({
      where: { tenantId: user.tenantId, ...(user.campusId ? { id: user.campusId } : {}) },
    });

    if (user.role === "PARENT") {
      const ids = await visibleStudentIds(this.prisma, user);
      const studentIds = ids === "all" ? [] : ids;
      const students = await this.prisma.student.findMany({
        where: { id: { in: studentIds } },
        include: {
          enrolments: {
            where: { academicYear: { status: "Active" } },
            include: { grade: true, section: true },
          },
          attendance: { where: { date: asDbDate(today) }, take: 1 },
          invoices: { include: { payments: true } },
        },
        orderBy: { fullName: "asc" },
      });
      return {
        role: user.role,
        campusName: campus?.name ?? "School",
        today,
        children: students.map((student) => {
          const enrolment = student.enrolments[0];
          const balance = student.invoices.reduce((sum, invoice) => {
            return sum + (rupees(invoice.amount) - rupees(paidTotal(invoice.payments)));
          }, 0);
          return {
            id: student.id,
            fullName: student.fullName,
            grade: enrolment?.grade.name ?? null,
            section: enrolment?.section.name ?? null,
            todayStatus: student.attendance[0]?.status ?? "NOT_MARKED",
            balance,
          };
        }),
      };
    }

    const teacherFilter = user.role === "TEACHER" ? { classTeacherId: user.id } : {};
    const sections = await this.prisma.section.findMany({
      where: {
        tenantId: user.tenantId,
        grade: { academicYear: { status: "Active" } },
        ...teacherFilter,
      },
      include: {
        grade: true,
        enrolments: true,
        attendance: { where: { date: asDbDate(today) } },
      },
    });

    const strength = sections.reduce((sum, section) => sum + section.enrolments.length, 0);
    const marked = sections.reduce((sum, section) => sum + section.attendance.length, 0);

    let outstanding = 0;
    if (user.role === "ADMIN") {
      const invoices = await this.prisma.invoice.findMany({
        where: { tenantId: user.tenantId },
        include: { payments: true },
      });
      outstanding = invoices.reduce(
        (sum, invoice) => sum + (rupees(invoice.amount) - rupees(paidTotal(invoice.payments))),
        0,
      );
    }

    return {
      role: user.role,
      campusName: campus?.name ?? "School",
      today,
      strength,
      markedToday: marked,
      unmarkedToday: strength - marked,
      outstanding,
      sections: sections.map((section) => ({
        id: section.id,
        label: `${section.grade.name} ${section.name}`,
        strength: section.enrolments.length,
        marked: section.attendance.length,
      })),
    };
  }
}
