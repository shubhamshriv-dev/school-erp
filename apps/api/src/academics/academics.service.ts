import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExamStatus, Prisma } from "@prisma/client";
import { ExamInput, MarksSubmitInput } from "@school/shared";
import { AuthUser } from "../common/auth.types";
import { studentWhere, visibleStudentIds } from "../common/scope";
import { PrismaService } from "../prisma/prisma.service";

const examInclude = {
  examSubjects: {
    include: { subject: { include: { grade: true } } },
    orderBy: { subject: { name: "asc" as const } },
  },
} satisfies Prisma.ExamInclude;

type ExamWithSubjects = Prisma.ExamGetPayload<{ include: typeof examInclude }>;

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const exams = await this.prisma.exam.findMany({
      where: {
        tenantId: user.tenantId,
        ...(user.role === "PARENT" ? { status: ExamStatus.PUBLISHED } : {}),
      },
      include: examInclude,
      orderBy: { name: "asc" },
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
      exams: exams.map((exam) => this.presentExam(exam)),
    };
  }

  async create(user: AuthUser, input: ExamInput) {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id: input.gradeId,
        tenantId: user.tenantId,
        academicYear: { status: "Active" },
      },
      include: { academicYear: true },
    });
    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    const codes = input.subjects.map((subject) => subjectCode(subject.name));
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException("Each subject on the exam needs its own name");
    }

    const existing = await this.prisma.exam.findFirst({
      where: { academicYearId: grade.academicYearId, name: input.name },
      include: examInclude,
    });
    if (existing?.status === "PUBLISHED") {
      throw new ConflictException("Published report cards cannot be changed");
    }
    if (existing?.examSubjects.some((link) => link.subject.gradeId === grade.id)) {
      throw new ConflictException(`${grade.name} is already part of ${input.name}`);
    }

    const exam = await this.prisma.$transaction(async (tx) => {
      const row =
        existing ??
        (await tx.exam.create({
          data: {
            tenantId: user.tenantId,
            campusId: grade.campusId,
            academicYearId: grade.academicYearId,
            name: input.name,
          },
        }));

      for (let index = 0; index < input.subjects.length; index += 1) {
        const subjectInput = input.subjects[index];
        const code = codes[index];
        const current = await tx.subject.findUnique({
          where: { gradeId_code: { gradeId: grade.id, code } },
        });
        if (current && current.maxMarks !== subjectInput.maxMarks) {
          throw new ConflictException(`${current.name} is already out of ${current.maxMarks}`);
        }
        const subject =
          current ??
          (await tx.subject.create({
            data: {
              tenantId: user.tenantId,
              campusId: grade.campusId,
              gradeId: grade.id,
              name: subjectInput.name.trim(),
              code,
              maxMarks: subjectInput.maxMarks,
            },
          }));
        await tx.examSubject.create({
          data: {
            tenantId: user.tenantId,
            campusId: grade.campusId,
            examId: row.id,
            subjectId: subject.id,
          },
        });
      }

      return tx.exam.findFirstOrThrow({ where: { id: row.id }, include: examInclude });
    });

    return this.presentExam(exam);
  }

  async publish(user: AuthUser, examId: string) {
    const exam = await this.examForTenant(user, examId);
    if (exam.examSubjects.length === 0) {
      throw new BadRequestException("Add subjects before publishing");
    }
    if (exam.status === "DRAFT") {
      await this.prisma.exam.update({
        where: { id: exam.id },
        data: { status: "PUBLISHED" },
      });
    }
    const published = await this.prisma.exam.findFirstOrThrow({
      where: { id: exam.id },
      include: examInclude,
    });
    return this.presentExam(published);
  }

  async marks(user: AuthUser, examId: string, sectionId: string) {
    const section = await this.sectionForMarks(user, sectionId);
    const exam = await this.examForTenant(user, examId);
    const subjects = subjectsForGrade(exam, section.gradeId);
    const enrolments = await this.prisma.enrolment.findMany({
      where: { tenantId: user.tenantId, sectionId },
      include: { student: true },
      orderBy: { rollNo: "asc" },
    });
    const saved = await this.prisma.mark.findMany({
      where: {
        tenantId: user.tenantId,
        examId: exam.id,
        studentId: { in: enrolments.map((row) => row.studentId) },
      },
    });

    return {
      exam: { id: exam.id, name: exam.name, status: exam.status },
      section: { id: section.id, label: `${section.grade.name} ${section.name}` },
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        maxMarks: subject.maxMarks,
      })),
      rows: enrolments.map((enrolment) => ({
        studentId: enrolment.studentId,
        admissionNo: enrolment.student.admissionNo,
        fullName: enrolment.student.fullName,
        rollNo: enrolment.rollNo,
        marks: Object.fromEntries(
          subjects.map((subject) => {
            const mark = saved.find(
              (row) => row.studentId === enrolment.studentId && row.subjectId === subject.id,
            );
            return [subject.id, mark?.marks ?? null];
          }),
        ),
      })),
    };
  }

  async submitMarks(user: AuthUser, examId: string, input: MarksSubmitInput) {
    const section = await this.sectionForMarks(user, input.sectionId);
    const exam = await this.examForTenant(user, examId);
    if (exam.status === "PUBLISHED") {
      throw new ConflictException("Published report cards cannot be changed");
    }
    const subjects = subjectsForGrade(exam, section.gradeId);
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const enrolments = await this.prisma.enrolment.findMany({
      where: { tenantId: user.tenantId, sectionId: section.id },
      select: { studentId: true },
    });
    const allowed = new Set(enrolments.map((row) => row.studentId));

    for (const record of input.records) {
      const subject = subjectById.get(record.subjectId);
      if (!subject || !allowed.has(record.studentId)) {
        throw new BadRequestException("A mark is for a student or subject outside this class");
      }
      if (record.marks !== null && record.marks > subject.maxMarks) {
        throw new BadRequestException(`${subject.name} marks cannot be above ${subject.maxMarks}`);
      }
    }

    await this.prisma.$transaction(
      input.records.map((record) =>
        record.marks === null
          ? this.prisma.mark.deleteMany({
              where: {
                examId: exam.id,
                subjectId: record.subjectId,
                studentId: record.studentId,
              },
            })
          : this.prisma.mark.upsert({
              where: {
                examId_subjectId_studentId: {
                  examId: exam.id,
                  subjectId: record.subjectId,
                  studentId: record.studentId,
                },
              },
              create: {
                tenantId: user.tenantId,
                campusId: section.campusId,
                examId: exam.id,
                subjectId: record.subjectId,
                studentId: record.studentId,
                marks: record.marks,
                enteredById: user.id,
              },
              update: { marks: record.marks, enteredById: user.id },
            }),
      ),
    );

    return this.marks(user, exam.id, section.id);
  }

  async reportList(user: AuthUser) {
    const ids = await visibleStudentIds(this.prisma, user);
    const students = await this.prisma.student.findMany({
      where: studentWhere(user, ids),
      include: {
        enrolments: {
          where: { academicYear: { status: "Active" } },
          include: { grade: true, section: true },
        },
      },
      orderBy: { fullName: "asc" },
    });
    const exams = await this.prisma.exam.findMany({
      where: {
        tenantId: user.tenantId,
        academicYear: { status: "Active" },
        ...(user.role === "PARENT" ? { status: ExamStatus.PUBLISHED } : {}),
      },
      orderBy: { name: "asc" },
    });
    return {
      exams: exams.map((exam) => ({ id: exam.id, name: exam.name, status: exam.status })),
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
            rollNo: enrolment.rollNo,
          },
        ];
      }),
    };
  }

  async reportCard(user: AuthUser, studentId: string, examId?: string) {
    const ids = await visibleStudentIds(this.prisma, user);
    if (ids !== "all" && !ids.includes(studentId)) {
      throw new ForbiddenException("You can open report cards only for your own students");
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId: user.tenantId },
      include: {
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

    const exam = examId
      ? await this.examForTenant(user, examId)
      : await this.prisma.exam.findFirst({
          where: {
            tenantId: user.tenantId,
            academicYearId: enrolment.academicYearId,
            ...(user.role === "PARENT" ? { status: ExamStatus.PUBLISHED } : {}),
          },
          include: examInclude,
          orderBy: { name: "desc" },
        });
    if (!exam) {
      throw new NotFoundException("Exam not found");
    }
    if (user.role === "PARENT" && exam.status !== "PUBLISHED") {
      throw new ForbiddenException("This report card is not published yet");
    }

    const subjects = exam.examSubjects
      .map((link) => link.subject)
      .filter((subject) => subject.gradeId === enrolment.gradeId);
    const saved = await this.prisma.mark.findMany({
      where: { tenantId: user.tenantId, examId: exam.id, studentId: student.id },
    });
    const lines = subjects.map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      maxMarks: subject.maxMarks,
      marks: saved.find((row) => row.subjectId === subject.id)?.marks ?? null,
    }));
    const entered = lines.filter((line) => line.marks !== null);
    const total = entered.reduce((sum, line) => sum + (line.marks ?? 0), 0);
    const maxTotal = entered.reduce((sum, line) => sum + line.maxMarks, 0);

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        admissionNo: student.admissionNo,
        grade: enrolment.grade.name,
        section: enrolment.section.name,
        rollNo: enrolment.rollNo,
      },
      academicYear: enrolment.academicYear.name,
      exam: { id: exam.id, name: exam.name, status: exam.status },
      subjects: lines,
      total,
      maxTotal,
      percentage: maxTotal === 0 ? null : Math.round((total / maxTotal) * 1000) / 10,
      complete: lines.length > 0 && lines.every((line) => line.marks !== null),
    };
  }

  private async examForTenant(user: AuthUser, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId: user.tenantId },
      include: examInclude,
    });
    if (!exam) {
      throw new NotFoundException("Exam not found");
    }
    return exam;
  }

  private async sectionForMarks(user: AuthUser, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, tenantId: user.tenantId },
      include: { grade: true },
    });
    if (!section) {
      throw new NotFoundException("Class not found");
    }
    if (user.role === "TEACHER" && section.classTeacherId !== user.id) {
      throw new ForbiddenException("You can enter marks only for your own class");
    }
    if (user.role === "PARENT") {
      throw new ForbiddenException("Parents open report cards");
    }
    return section;
  }

  private presentExam(exam: ExamWithSubjects) {
    const grades = new Map<string, { id: string; name: string; subjects: { id: string; name: string; maxMarks: number }[] }>();
    for (const link of exam.examSubjects) {
      const current = grades.get(link.subject.gradeId) ?? {
        id: link.subject.grade.id,
        name: link.subject.grade.name,
        subjects: [],
      };
      current.subjects.push({
        id: link.subject.id,
        name: link.subject.name,
        maxMarks: link.subject.maxMarks,
      });
      grades.set(link.subject.gradeId, current);
    }
    return {
      id: exam.id,
      name: exam.name,
      status: exam.status,
      grades: [...grades.values()],
    };
  }
}

function subjectsForGrade(exam: ExamWithSubjects, gradeId: string) {
  const subjects = exam.examSubjects
    .map((link) => link.subject)
    .filter((subject) => subject.gradeId === gradeId);
  if (subjects.length === 0) {
    throw new BadRequestException("This exam has no subjects for this class");
  }
  return subjects;
}

function subjectCode(name: string) {
  const code = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  if (code.length < 2) {
    throw new BadRequestException("Subject name needs letters or numbers");
  }
  return code;
}
