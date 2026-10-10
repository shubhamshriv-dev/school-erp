import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EnquiryStatus } from "@prisma/client";
import { EnrolInput, EnquiryInput, EnquiryStatusInput } from "@school/shared";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { asDbDate, formatDbDate } from "../common/dates";
import { AuthUser } from "../common/auth.types";
import { FeesService } from "../fees/fees.service";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";

const nextStatus: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW: ["CONTACTED", "APPLIED", "REJECTED", "WITHDRAWN"],
  CONTACTED: ["APPLIED", "REJECTED", "WITHDRAWN"],
  APPLIED: ["OFFERED", "REJECTED", "WITHDRAWN"],
  OFFERED: ["REJECTED", "WITHDRAWN"],
  ENROLLED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

@Injectable()
export class AdmissionsService {
  // Enquiry to enrolment for the active campus year.
  constructor(
    private readonly prisma: PrismaService,
    private readonly students: StudentsService,
    private readonly fees: FeesService,
  ) {}

  async options(user: AuthUser) {
    const year = await this.prisma.academicYear.findFirst({
      where: { tenantId: user.tenantId, status: "Active" },
      include: {
        grades: {
          orderBy: { name: "asc" },
          include: { sections: { orderBy: { name: "asc" }, include: { enrolments: true } } },
        },
      },
    });
    if (!year) {
      return { academicYear: null, grades: [] };
    }
    return {
      academicYear: { id: year.id, name: year.name },
      grades: year.grades.map((grade) => ({
        id: grade.id,
        name: grade.name,
        sections: grade.sections.map((section) => ({
          id: section.id,
          name: section.name,
          seatsLeft: section.capacity - section.enrolments.length,
        })),
      })),
    };
  }

  async list(user: AuthUser) {
    const rows = await this.prisma.enquiry.findMany({
      where: { tenantId: user.tenantId },
      include: { grade: true, student: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.present(row));
  }

  async create(user: AuthUser, input: EnquiryInput) {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id: input.gradeId,
        tenantId: user.tenantId,
        academicYear: { status: "Active" },
      },
      include: { academicYear: true, campus: true },
    });
    if (!grade) {
      throw new BadRequestException("Choose an open grade");
    }

    const duplicate = await this.prisma.enquiry.findFirst({
      where: {
        tenantId: user.tenantId,
        childName: { equals: input.childName, mode: "insensitive" },
        parentMobile: input.parentMobile,
        dateOfBirth: asDbDate(input.dateOfBirth),
        status: { notIn: ["REJECTED", "WITHDRAWN"] },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        duplicate.status === "ENROLLED"
          ? "This child is already enrolled"
          : "An open enquiry already exists for this child and mobile number",
      );
    }

    const created = await this.prisma.enquiry.create({
      data: {
        tenantId: user.tenantId,
        campusId: grade.campusId,
        academicYearId: grade.academicYearId,
        gradeId: grade.id,
        childName: input.childName.trim(),
        dateOfBirth: asDbDate(input.dateOfBirth),
        gender: input.gender || null,
        parentName: input.parentName.trim(),
        parentMobile: input.parentMobile,
        parentEmail: input.parentEmail || null,
        source: input.source,
        remarks: input.remarks || null,
        consentAt: new Date(),
        status: "NEW",
      },
      include: { grade: true, student: true },
    });
    return this.present(created);
  }

  async updateStatus(user: AuthUser, id: string, input: EnquiryStatusInput) {
    const enquiry = await this.findOwn(user, id);
    if (!nextStatus[enquiry.status].includes(input.status)) {
      throw new BadRequestException(`Cannot move ${enquiry.status} to ${input.status}`);
    }
    const updated = await this.prisma.enquiry.update({
      where: { id: enquiry.id },
      data: { status: input.status },
      include: { grade: true, student: true },
    });
    return this.present(updated);
  }

  async enrol(user: AuthUser, id: string, input: EnrolInput) {
    const enquiry = await this.findOwn(user, id);
    if (enquiry.status !== "OFFERED") {
      throw new BadRequestException("Offer a seat before enrolment");
    }

    const section = await this.prisma.section.findFirst({
      where: { id: input.sectionId, tenantId: user.tenantId, gradeId: enquiry.gradeId },
      include: { enrolments: true, grade: true, campus: true },
    });
    if (!section) {
      throw new BadRequestException("Choose a section in the grade they applied for");
    }
    if (section.enrolments.length >= section.capacity) {
      throw new BadRequestException("That section is full");
    }

    const email = enquiry.parentEmail?.toLowerCase() ?? null;
    const plainPassword = email ? `Parent@${randomBytes(3).toString("hex")}` : null;
    const passwordHash = plainPassword ? await bcrypt.hash(plainPassword, 10) : null;

    const result = await this.prisma.$transaction(async (db) => {
      const student = await this.students.createFromAdmission(db, {
        tenantId: enquiry.tenantId,
        campusId: enquiry.campusId,
        campusCode: section.campus.code,
        academicYearId: enquiry.academicYearId,
        gradeId: enquiry.gradeId,
        sectionId: section.id,
        fullName: enquiry.childName,
        dateOfBirth: enquiry.dateOfBirth,
        gender: enquiry.gender,
        parentName: enquiry.parentName,
        parentMobile: enquiry.parentMobile,
        parentEmail: email,
        portalPasswordHash: passwordHash,
      });
      const invoice = await this.fees.issueTuitionInvoice(db, {
        tenantId: enquiry.tenantId,
        campusId: enquiry.campusId,
        legalEntityId: section.campus.legalEntityId,
        studentId: student.studentId,
        gradeId: enquiry.gradeId,
        academicYearId: enquiry.academicYearId,
      });
      await db.enquiry.update({
        where: { id: enquiry.id },
        data: { status: "ENROLLED", studentId: student.studentId },
      });
      return { student, invoiceNo: invoice.invoiceNo };
    });

    return {
      studentId: result.student.studentId,
      admissionNo: result.student.admissionNo,
      rollNo: result.student.rollNo,
      section: `${section.grade.name} ${section.name}`,
      invoiceNo: result.invoiceNo,
      portalEmail: result.student.portalLinked ? email : null,
      portalPassword: result.student.portalLinked && plainPassword && email ? plainPassword : null,
    };
  }

  private async findOwn(user: AuthUser, id: string) {
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!enquiry) {
      throw new NotFoundException("Enquiry not found");
    }
    return enquiry;
  }

  private present(row: {
    id: string;
    childName: string;
    dateOfBirth: Date;
    gender: string | null;
    parentName: string;
    parentMobile: string;
    parentEmail: string | null;
    source: string;
    remarks: string | null;
    status: EnquiryStatus;
    gradeId: string;
    grade: { name: string };
    student: { id: string; admissionNo: string } | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      childName: row.childName,
      dateOfBirth: formatDbDate(row.dateOfBirth),
      gender: row.gender,
      parentName: row.parentName,
      parentMobile: row.parentMobile,
      parentEmail: row.parentEmail,
      source: row.source,
      remarks: row.remarks,
      status: row.status,
      gradeId: row.gradeId,
      grade: row.grade.name,
      studentId: row.student?.id ?? null,
      admissionNo: row.student?.admissionNo ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
