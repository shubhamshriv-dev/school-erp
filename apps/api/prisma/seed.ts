import { AttendanceStatus, InvoiceStatus, PaymentMode, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function day(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function localIso(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function main() {
  if (process.env.SEED_IF_EMPTY === "1") {
    const existing = await prisma.user.count();
    if (existing > 0) {
      console.log("Database already has users. Seed skipped.");
      return;
    }
  }

  await prisma.enquiry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feePlan.deleteMany();
  await prisma.feeHead.deleteMany();
  await prisma.enrolment.deleteMany();
  await prisma.guardianLink.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.section.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.legalEntity.deleteMany();
  await prisma.tenant.deleteMany();

  const tenant = await prisma.tenant.create({
    data: { name: "Riverside Education Group" },
  });
  const entity = await prisma.legalEntity.create({
    data: { tenantId: tenant.id, name: "Riverside Education Trust" },
  });
  const campus = await prisma.campus.create({
    data: {
      tenantId: tenant.id,
      legalEntityId: entity.id,
      name: "Riverside Public School",
      code: "RPS",
      board: "CBSE",
      city: "Pune",
      pin: "411001",
      status: "Active",
    },
  });

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const teacherPassword = await bcrypt.hash("Teacher@123", 10);
  const parentPassword = await bcrypt.hash("Parent@123", 10);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      email: "anita.deshpande@riverside.edu",
      passwordHash: adminPassword,
      name: "Anita Deshpande",
      role: UserRole.ADMIN,
    },
  });
  const teacher = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      email: "priya.natarajan@riverside.edu",
      passwordHash: teacherPassword,
      name: "Priya Natarajan",
      role: UserRole.TEACHER,
    },
  });
  const parent = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      email: "meera.shah@riverside.edu",
      passwordHash: parentPassword,
      name: "Meera Shah",
      role: UserRole.PARENT,
    },
  });

  const year = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      name: "2026-27",
      startDate: day("2026-04-01"),
      endDate: day("2027-03-31"),
      status: "Active",
    },
  });

  const grade5 = await prisma.grade.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      academicYearId: year.id,
      name: "Grade 5",
    },
  });
  const grade6 = await prisma.grade.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      academicYearId: year.id,
      name: "Grade 6",
    },
  });

  const section5 = await prisma.section.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      gradeId: grade5.id,
      name: "A",
      capacity: 40,
      classTeacherId: teacher.id,
    },
  });
  const section6 = await prisma.section.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      gradeId: grade6.id,
      name: "A",
      capacity: 40,
    },
  });

  const tuition = await prisma.feeHead.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      name: "Tuition",
      code: "TUI",
    },
  });
  const plan5 = await prisma.feePlan.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      academicYearId: year.id,
      gradeId: grade5.id,
      feeHeadId: tuition.id,
      name: "Grade 5 tuition 2026-27",
      amount: "48000.00",
    },
  });
  const plan6 = await prisma.feePlan.create({
    data: {
      tenantId: tenant.id,
      campusId: campus.id,
      academicYearId: year.id,
      gradeId: grade6.id,
      feeHeadId: tuition.id,
      name: "Grade 6 tuition 2026-27",
      amount: "52000.00",
    },
  });

  const grade5Students = [
    { fullName: "Aarav Shah", admissionNo: "RPS-2401", rollNo: 1, gender: "Male", dob: "2015-04-12", paid: 20000, guardian: "portal" },
    { fullName: "Anaya Shah", admissionNo: "RPS-2402", rollNo: 2, gender: "Female", dob: "2015-09-03", paid: 0, guardian: "portal" },
    { fullName: "Kabir Menon", admissionNo: "RPS-2403", rollNo: 3, gender: "Male", dob: "2015-01-21", paid: 48000, guardian: "Rohan Menon" },
    { fullName: "Diya Iyer", admissionNo: "RPS-2404", rollNo: 4, gender: "Female", dob: "2015-06-18", paid: 10000, guardian: "Lakshmi Iyer" },
    { fullName: "Arjun Rao", admissionNo: "RPS-2405", rollNo: 5, gender: "Male", dob: "2015-11-09", paid: 0, guardian: "Sanjay Rao" },
    { fullName: "Sara Khan", admissionNo: "RPS-2406", rollNo: 6, gender: "Female", dob: "2015-02-27", paid: 48000, guardian: "Farah Khan" },
  ] as const;

  const grade6Students = [
    { fullName: "Vivaan Gupta", admissionNo: "RPS-2308", rollNo: 1, gender: "Male", dob: "2014-08-14", paid: 26000, guardian: "Neha Gupta" },
    { fullName: "Myra Joshi", admissionNo: "RPS-2309", rollNo: 2, gender: "Female", dob: "2014-03-02", paid: 0, guardian: "Amit Joshi" },
    { fullName: "Ishaan Patel", admissionNo: "RPS-2310", rollNo: 3, gender: "Male", dob: "2014-12-19", paid: 52000, guardian: "Pooja Patel" },
    { fullName: "Kiara Nair", admissionNo: "RPS-2311", rollNo: 4, gender: "Female", dob: "2014-05-30", paid: 15000, guardian: "Rahul Nair" },
  ] as const;

  const meera = await prisma.guardian.create({
    data: {
      tenantId: tenant.id,
      userId: parent.id,
      name: "Meera Shah",
      mobile: "9876501234",
      email: parent.email,
    },
  });

  let invoiceSeq = 1;
  let receiptSeq = 1;
  const yesterday = day(localIso(-1));

  async function enrol(
    studentInput: { fullName: string; admissionNo: string; rollNo: number; gender: string; dob: string; paid: number; guardian: string },
    gradeId: string,
    sectionId: string,
    planId: string,
    planAmount: number,
    yesterdayStatus?: AttendanceStatus,
  ) {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        campusId: campus.id,
        admissionNo: studentInput.admissionNo,
        fullName: studentInput.fullName,
        dateOfBirth: day(studentInput.dob),
        gender: studentInput.gender,
        status: "ACTIVE",
      },
    });
    await prisma.enrolment.create({
      data: {
        tenantId: tenant.id,
        campusId: campus.id,
        studentId: student.id,
        academicYearId: year.id,
        gradeId,
        sectionId,
        rollNo: studentInput.rollNo,
      },
    });

    if (studentInput.guardian === "portal") {
      await prisma.guardianLink.create({
        data: {
          tenantId: tenant.id,
          guardianId: meera.id,
          studentId: student.id,
          relation: "Mother",
          isPrimary: true,
        },
      });
    } else {
      const guardian = await prisma.guardian.create({
        data: {
          tenantId: tenant.id,
          name: studentInput.guardian,
          mobile: `98${studentInput.admissionNo.replace(/\D/g, "").slice(-8)}`,
        },
      });
      await prisma.guardianLink.create({
        data: {
          tenantId: tenant.id,
          guardianId: guardian.id,
          studentId: student.id,
          relation: "Parent",
          isPrimary: true,
        },
      });
    }

    const status =
      studentInput.paid <= 0
        ? InvoiceStatus.ISSUED
        : studentInput.paid >= planAmount
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTLY_PAID;
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        campusId: campus.id,
        legalEntityId: entity.id,
        studentId: student.id,
        feePlanId: planId,
        invoiceNo: `INV-2026-${String(invoiceSeq).padStart(4, "0")}`,
        amount: planAmount.toFixed(2),
        dueDate: day("2026-11-15"),
        status,
      },
    });
    invoiceSeq += 1;

    if (studentInput.paid > 0) {
      await prisma.payment.create({
        data: {
          tenantId: tenant.id,
          campusId: campus.id,
          invoiceId: invoice.id,
          amount: studentInput.paid.toFixed(2),
          mode: PaymentMode.UPI,
          receiptNo: `RCP-${String(receiptSeq).padStart(4, "0")}`,
          recordedById: admin.id,
          paidAt: day("2026-08-12"),
        },
      });
      receiptSeq += 1;
    }

    if (yesterdayStatus) {
      await prisma.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          campusId: campus.id,
          studentId: student.id,
          sectionId,
          date: yesterday,
          status: yesterdayStatus,
          markedById: teacher.id,
          remarks: yesterdayStatus === "LATE" ? "Arrived after assembly" : null,
        },
      });
    }
  }

  const yesterdayMarks: AttendanceStatus[] = ["PRESENT", "PRESENT", "ABSENT", "PRESENT", "PRESENT", "LATE"];
  for (let index = 0; index < grade5Students.length; index += 1) {
    await enrol(grade5Students[index], grade5.id, section5.id, plan5.id, 48000, yesterdayMarks[index]);
  }
  for (const student of grade6Students) {
    await enrol(student, grade6.id, section6.id, plan6.id, 52000);
  }

  await prisma.enquiry.createMany({
    data: [
      {
        tenantId: tenant.id,
        campusId: campus.id,
        academicYearId: year.id,
        gradeId: grade5.id,
        childName: "Reyansh Kulkarni",
        dateOfBirth: day("2015-07-08"),
        gender: "Male",
        parentName: "Sneha Kulkarni",
        parentMobile: "9845011122",
        parentEmail: "sneha.kulkarni@example.com",
        source: "WALK_IN",
        remarks: "Visited the campus on Saturday",
        consentAt: new Date(),
        status: "CONTACTED",
      },
      {
        tenantId: tenant.id,
        campusId: campus.id,
        academicYearId: year.id,
        gradeId: grade6.id,
        childName: "Aisha Qureshi",
        dateOfBirth: day("2014-10-22"),
        gender: "Female",
        parentName: "Imran Qureshi",
        parentMobile: "9845033344",
        parentEmail: "imran.qureshi@example.com",
        source: "WEB",
        consentAt: new Date(),
        status: "APPLIED",
      },
    ],
  });

  console.log("Seeded Riverside Public School");
  console.log("Admin   anita.deshpande@riverside.edu  Admin@123");
  console.log("Teacher priya.natarajan@riverside.edu  Teacher@123");
  console.log("Parent  meera.shah@riverside.edu       Parent@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
