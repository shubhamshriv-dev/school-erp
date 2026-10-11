import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Weekday } from "@prisma/client";
import { TimetableInput } from "@school/shared";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const dayOrder: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async sections(user: AuthUser) {
    if (user.role === "PARENT") {
      const links = await this.prisma.guardianLink.findMany({
        where: { tenantId: user.tenantId, guardian: { userId: user.id } },
        select: {
          student: {
            select: {
              enrolments: {
                where: { academicYear: { status: "Active" } },
                select: { sectionId: true },
              },
            },
          },
        },
      });
      const ids = [...new Set(links.flatMap((link) => link.student.enrolments.map((row) => row.sectionId)))];
      return this.presentSections(user, ids);
    }

    return this.presentSections(
      user,
      user.role === "TEACHER" ? undefined : "all",
    );
  }

  async get(user: AuthUser, sectionId: string) {
    const section = await this.sectionForUser(user, sectionId);
    const periods = await this.prisma.timetablePeriod.findMany({
      where: { tenantId: user.tenantId, sectionId: section.id },
    });
    return {
      section: { id: section.id, label: `${section.grade.name} ${section.name}` },
      periods: periods
        .sort((left, right) => dayOrder.indexOf(left.day) - dayOrder.indexOf(right.day) || left.startTime.localeCompare(right.startTime))
        .map((period) => ({
          day: period.day,
          startTime: period.startTime,
          endTime: period.endTime,
          subject: period.subject,
        })),
    };
  }

  async save(user: AuthUser, input: TimetableInput) {
    const section = await this.sectionForUser(user, input.sectionId);
    assertNoOverlap(input.periods);
    await this.prisma.$transaction(async (tx) => {
      await tx.timetablePeriod.deleteMany({ where: { tenantId: user.tenantId, sectionId: section.id } });
      if (input.periods.length > 0) {
        await tx.timetablePeriod.createMany({
          data: input.periods.map((period) => ({
            tenantId: user.tenantId,
            campusId: section.campusId,
            sectionId: section.id,
            day: period.day,
            startTime: period.startTime,
            endTime: period.endTime,
            subject: period.subject,
          })),
        });
      }
    });
    return this.get(user, section.id);
  }

  private async presentSections(user: AuthUser, ids: string[] | "all" | undefined) {
    const sections = await this.prisma.section.findMany({
      where: {
        tenantId: user.tenantId,
        grade: { academicYear: { status: "Active" } },
        ...(user.role === "TEACHER" ? { classTeacherId: user.id } : {}),
        ...(ids && ids !== "all" ? { id: { in: ids } } : {}),
      },
      include: { grade: true },
      orderBy: [{ grade: { name: "asc" } }, { name: "asc" }],
    });
    return sections.map((section) => ({
      id: section.id,
      label: `${section.grade.name} ${section.name}`,
    }));
  }

  private async sectionForUser(user: AuthUser, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, tenantId: user.tenantId, grade: { academicYear: { status: "Active" } } },
      include: { grade: true },
    });
    if (!section) {
      throw new NotFoundException("Class not found");
    }
    if (user.role === "TEACHER" && section.classTeacherId !== user.id) {
      throw new ForbiddenException("You can open the timetable only for your own class");
    }
    if (user.role === "PARENT") {
      const allowed = await this.sections(user);
      if (!allowed.some((row) => row.id === section.id)) {
        throw new ForbiddenException("You can open the timetable only for your own class");
      }
    }
    return section;
  }
}

function assertNoOverlap(periods: TimetableInput["periods"]) {
  const byDay = new Map<string, { start: number; end: number }[]>();
  for (const period of periods) {
    const start = minutes(period.startTime);
    const end = minutes(period.endTime);
    if (end <= start) {
      throw new BadRequestException("A period must end after it starts");
    }
    const rows = byDay.get(period.day) ?? [];
    if (rows.some((row) => start < row.end && end > row.start)) {
      throw new BadRequestException("Two periods overlap on the same day");
    }
    rows.push({ start, end });
    byDay.set(period.day, rows);
  }
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
