import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./auth.types";

export async function visibleStudentIds(prisma: PrismaService, user: AuthUser) {
  if (user.role === "ADMIN") {
    return "all" as const;
  }

  if (user.role === "TEACHER") {
    const enrolments = await prisma.enrolment.findMany({
      where: {
        tenantId: user.tenantId,
        section: { classTeacherId: user.id },
      },
      select: { studentId: true },
    });
    return enrolments.map((row) => row.studentId);
  }

  const links = await prisma.guardianLink.findMany({
    where: { tenantId: user.tenantId, guardian: { userId: user.id } },
    select: { studentId: true },
  });
  return links.map((row) => row.studentId);
}

export function studentWhere(user: AuthUser, ids: string[] | "all") {
  return {
    tenantId: user.tenantId,
    ...(ids === "all" ? {} : { id: { in: ids } }),
  };
}

export async function loadSectionForUser(
  prisma: PrismaService,
  user: AuthUser,
  sectionId: string,
) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, tenantId: user.tenantId },
    include: { grade: true, classTeacher: true },
  });
  if (!section) {
    throw new NotFoundException("Class not found");
  }
  if (user.role === "TEACHER" && section.classTeacherId !== user.id) {
    throw new ForbiddenException("You can mark attendance only for your own class");
  }
  if (user.role === "PARENT") {
    throw new ForbiddenException("Parents can view attendance on the student profile");
  }
  return section;
}
