import { BadRequestException, Injectable } from "@nestjs/common";
import { AttendanceSubmitInput } from "@school/shared";
import { asDbDate, formatDbDate } from "../common/dates";
import { loadSectionForUser } from "../common/scope";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async register(user: AuthUser, sectionId: string, date: string) {
    const section = await loadSectionForUser(this.prisma, user, sectionId);
    const day = asDbDate(date);
    const enrolments = await this.prisma.enrolment.findMany({
      where: { tenantId: user.tenantId, sectionId },
      include: { student: true },
      orderBy: { rollNo: "asc" },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId: user.tenantId, sectionId, date: day },
    });
    const byStudent = new Map(records.map((record) => [record.studentId, record]));

    return {
      section: {
        id: section.id,
        label: `${section.grade.name} ${section.name}`,
        classTeacher: section.classTeacher?.name ?? null,
      },
      date,
      rows: enrolments.map((enrolment) => {
        const record = byStudent.get(enrolment.studentId);
        return {
          studentId: enrolment.studentId,
          admissionNo: enrolment.student.admissionNo,
          fullName: enrolment.student.fullName,
          rollNo: enrolment.rollNo,
          status: record?.status ?? null,
          remarks: record?.remarks ?? "",
        };
      }),
    };
  }

  async submit(user: AuthUser, input: AttendanceSubmitInput) {
    const section = await loadSectionForUser(this.prisma, user, input.sectionId);
    const enrolments = await this.prisma.enrolment.findMany({
      where: { tenantId: user.tenantId, sectionId: input.sectionId },
      select: { studentId: true },
    });
    const allowed = new Set(enrolments.map((row) => row.studentId));
    if (input.records.some((record) => !allowed.has(record.studentId))) {
      throw new BadRequestException("A student in this register is not in the class");
    }

    const day = asDbDate(input.date);
    await this.prisma.$transaction(
      input.records.map((record) =>
        this.prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: record.studentId, date: day } },
          create: {
            tenantId: user.tenantId,
            campusId: section.campusId,
            studentId: record.studentId,
            sectionId: section.id,
            date: day,
            status: record.status,
            remarks: record.remarks ?? null,
            markedById: user.id,
          },
          update: {
            status: record.status,
            remarks: record.remarks ?? null,
            markedById: user.id,
            sectionId: section.id,
          },
        }),
      ),
    );

    return this.register(user, input.sectionId, formatDbDate(day));
  }
}
