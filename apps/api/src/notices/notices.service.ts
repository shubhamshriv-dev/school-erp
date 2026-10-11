import { Injectable, NotFoundException } from "@nestjs/common";
import { NoticeAudience, Prisma } from "@prisma/client";
import { NoticeInput } from "@school/shared";
import { AuthUser } from "../common/auth.types";
import { PrismaService } from "../prisma/prisma.service";

const noticeInclude = {
  grade: true,
  createdBy: true,
} satisfies Prisma.NoticeInclude;

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const gradeIds = await this.visibleGradeIds(user);
    const notices = await this.prisma.notice.findMany({
      where: {
        tenantId: user.tenantId,
        academicYear: { status: "Active" },
        ...(gradeIds === "all"
          ? {}
          : {
              OR: [{ audience: NoticeAudience.SCHOOL }, { gradeId: { in: gradeIds } }],
            }),
      },
      include: noticeInclude,
      orderBy: { createdAt: "desc" },
    });
    const grades =
      user.role === "ADMIN"
        ? await this.prisma.grade.findMany({
            where: { tenantId: user.tenantId, academicYear: { status: "Active" } },
            orderBy: { name: "asc" },
          })
        : [];
    return {
      grades: grades.map((grade) => ({ id: grade.id, name: grade.name })),
      notices: notices.map((notice) => this.present(notice)),
    };
  }

  async create(user: AuthUser, input: NoticeInput) {
    const year = await this.prisma.academicYear.findFirst({
      where: { tenantId: user.tenantId, status: "Active" },
    });
    if (!year) {
      throw new NotFoundException("Academic year not found");
    }

    let gradeId: string | null = null;
    if (input.audience === "GRADE") {
      const grade = await this.prisma.grade.findFirst({
        where: { id: input.gradeId, tenantId: user.tenantId, academicYearId: year.id },
      });
      if (!grade) {
        throw new NotFoundException("Grade not found");
      }
      gradeId = grade.id;
    }

    const notice = await this.prisma.notice.create({
      data: {
        tenantId: user.tenantId,
        campusId: year.campusId,
        academicYearId: year.id,
        gradeId,
        audience: input.audience,
        title: input.title,
        body: input.body,
        createdById: user.id,
      },
      include: noticeInclude,
    });
    return this.present(notice);
  }

  private async visibleGradeIds(user: AuthUser) {
    if (user.role === "ADMIN") {
      return "all" as const;
    }
    if (user.role === "TEACHER") {
      const sections = await this.prisma.section.findMany({
        where: { tenantId: user.tenantId, classTeacherId: user.id },
        select: { gradeId: true },
      });
      return [...new Set(sections.map((section) => section.gradeId))];
    }
    const links = await this.prisma.guardianLink.findMany({
      where: { tenantId: user.tenantId, guardian: { userId: user.id } },
      select: {
        student: {
          select: {
            enrolments: {
              where: { academicYear: { status: "Active" } },
              select: { gradeId: true },
            },
          },
        },
      },
    });
    return [
      ...new Set(links.flatMap((link) => link.student.enrolments.map((enrolment) => enrolment.gradeId))),
    ];
  }

  private present(notice: Prisma.NoticeGetPayload<{ include: typeof noticeInclude }>) {
    return {
      id: notice.id,
      title: notice.title,
      body: notice.body,
      audience: notice.audience,
      gradeId: notice.gradeId,
      grade: notice.grade?.name ?? null,
      postedBy: notice.createdBy.name,
      createdAt: notice.createdAt.toISOString(),
    };
  }
}
