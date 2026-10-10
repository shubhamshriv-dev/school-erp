import { Injectable } from "@nestjs/common";
import { formatDbDate } from "../common/dates";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const campus = await this.prisma.campus.findFirst({
      where: {
        tenantId: user.tenantId,
        ...(user.campusId ? { id: user.campusId } : {}),
      },
      include: {
        tenant: true,
        legalEntity: true,
        years: {
          where: { status: "Active" },
          include: {
            grades: {
              orderBy: { name: "asc" },
              include: {
                sections: {
                  orderBy: { name: "asc" },
                  include: { classTeacher: true, enrolments: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campus) {
      return null;
    }

    const year = campus.years[0];
    return {
      tenant: { name: campus.tenant.name },
      legalEntity: { name: campus.legalEntity.name },
      campus: {
        name: campus.name,
        code: campus.code,
        board: campus.board,
        city: campus.city,
        pin: campus.pin,
        status: campus.status,
      },
      academicYear: year
        ? {
            name: year.name,
            status: year.status,
            startDate: formatDbDate(year.startDate),
            endDate: formatDbDate(year.endDate),
            grades: year.grades.map((grade) => ({
              id: grade.id,
              name: grade.name,
              sections: grade.sections.map((section) => ({
                id: section.id,
                name: section.name,
                capacity: section.capacity,
                strength: section.enrolments.length,
                classTeacher: section.classTeacher?.name ?? null,
              })),
            })),
          }
        : null,
    };
  }

  async sections(user: AuthUser) {
    const sections = await this.prisma.section.findMany({
      where: {
        tenantId: user.tenantId,
        ...(user.role === "TEACHER" ? { classTeacherId: user.id } : {}),
        grade: { academicYear: { status: "Active" } },
      },
      include: { grade: true, classTeacher: true },
      orderBy: [{ grade: { name: "asc" } }, { name: "asc" }],
    });

    return sections.map((section) => ({
      id: section.id,
      name: section.name,
      gradeName: section.grade.name,
      label: `${section.grade.name} ${section.name}`,
      classTeacher: section.classTeacher?.name ?? null,
    }));
  }
}
