import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CertificateInput } from "@school/shared";
import { AuthUser } from "../common/auth.types";
import { asDbDate, formatDbDate, localDate } from "../common/dates";
import { studentWhere, visibleStudentIds } from "../common/scope";
import { PrismaService } from "../prisma/prisma.service";

const certificateInclude = { issuedBy: true } satisfies Prisma.CertificateInclude;

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const ids = await visibleStudentIds(this.prisma, user);
    const [certificates, students] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { tenantId: user.tenantId, student: studentWhere(user, ids) },
        include: certificateInclude,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.student.findMany({
        where: { ...studentWhere(user, ids), status: "ACTIVE" },
        include: {
          enrolments: { where: { academicYear: { status: "Active" } }, include: { grade: true, section: true } },
        },
        orderBy: { fullName: "asc" },
      }),
    ]);

    return {
      students: students.flatMap((student) => {
        const enrolment = student.enrolments[0];
        if (!enrolment) return [];
        return [
          {
            id: student.id,
            fullName: student.fullName,
            admissionNo: student.admissionNo,
            grade: enrolment.grade.name,
            section: enrolment.section.name,
          },
        ];
      }),
      certificates: certificates.map((certificate) => this.present(certificate)),
    };
  }

  async get(user: AuthUser, id: string) {
    const ids = await visibleStudentIds(this.prisma, user);
    const certificate = await this.prisma.certificate.findFirst({
      where: { id, tenantId: user.tenantId, student: studentWhere(user, ids) },
      include: certificateInclude,
    });
    if (!certificate) {
      throw new NotFoundException("Certificate not found");
    }
    return this.present(certificate);
  }

  async issue(user: AuthUser, input: CertificateInput) {
    const student = await this.prisma.student.findFirst({
      where: { id: input.studentId, tenantId: user.tenantId, status: "ACTIVE" },
      include: {
        campus: true,
        enrolments: {
          where: { academicYear: { status: "Active" } },
          include: { grade: true, section: true, academicYear: true },
        },
      },
    });
    const enrolment = student?.enrolments[0];
    if (!student || !enrolment) {
      throw new NotFoundException("Student not found");
    }

    const issuedOn = localDate();
    const year = issuedOn.slice(0, 4);
    const certificate = await this.prisma.$transaction(async (tx) => {
      const count = await tx.certificate.count({ where: { campusId: student.campusId } });
      return tx.certificate.create({
        data: {
          tenantId: user.tenantId,
          campusId: student.campusId,
          studentId: student.id,
          certificateNo: `BON-${year}-${String(count + 1).padStart(4, "0")}`,
          purpose: input.purpose,
          studentName: student.fullName,
          admissionNo: student.admissionNo,
          gradeName: enrolment.grade.name,
          sectionName: enrolment.section.name,
          academicYearName: enrolment.academicYear.name,
          campusName: student.campus.name,
          issuedOn: asDbDate(issuedOn),
          issuedById: user.id,
        },
        include: certificateInclude,
      });
    });

    return this.present(certificate);
  }

  private present(certificate: Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>) {
    return {
      id: certificate.id,
      certificateNo: certificate.certificateNo,
      purpose: certificate.purpose,
      studentId: certificate.studentId,
      studentName: certificate.studentName,
      admissionNo: certificate.admissionNo,
      grade: certificate.gradeName,
      section: certificate.sectionName,
      academicYear: certificate.academicYearName,
      campus: certificate.campusName,
      issuedOn: formatDbDate(certificate.issuedOn),
      issuedBy: certificate.issuedBy.name,
    };
  }
}
