import { z } from "zod";

export const userRoles = ["ADMIN", "TEACHER", "PARENT"] as const;
export type UserRole = (typeof userRoles)[number];

export const attendanceStatuses = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EARLY_LEAVE",
  "LEAVE",
] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const enquiryStatuses = [
  "NEW",
  "CONTACTED",
  "APPLIED",
  "OFFERED",
  "ENROLLED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export const enquirySources = ["WALK_IN", "WEB", "REFERRAL", "AD", "EVENT"] as const;
export type EnquirySource = (typeof enquirySources)[number];

export const paymentModes = ["CASH", "UPI", "BANK_TRANSFER"] as const;
export type PaymentMode = (typeof paymentModes)[number];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(attendanceStatuses),
  remarks: z.string().max(200).optional(),
});

export const attendanceSubmitSchema = z.object({
  sectionId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(attendanceRecordSchema).min(1),
});

export const paymentSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(paymentModes),
});

export const enquirySchema = z.object({
  childName: z.string().trim().min(2).max(80),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.string().trim().max(40).optional(),
  gradeId: z.string().uuid(),
  parentName: z.string().trim().min(2).max(80),
  parentMobile: z.string().regex(/^\d{10}$/),
  parentEmail: z.union([z.string().email(), z.literal("")]).optional(),
  source: z.enum(enquirySources),
  remarks: z.string().trim().max(400).optional(),
  consent: z.literal(true),
});

export const enquiryStatusSchema = z.object({
  status: z.enum(["CONTACTED", "APPLIED", "OFFERED", "REJECTED", "WITHDRAWN"]),
});

export const enrolSchema = z.object({
  sectionId: z.string().uuid(),
});

export const examSubjectSchema = z.object({
  name: z.string().trim().min(2).max(40),
  maxMarks: z.number().int().min(1).max(200),
});

export const examSchema = z.object({
  name: z.string().trim().min(2).max(40),
  gradeId: z.string().uuid(),
  subjects: z.array(examSubjectSchema).min(1).max(12),
});

export const markRecordSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  marks: z.number().int().min(0).max(200).nullable(),
});

export const marksSubmitSchema = z.object({
  sectionId: z.string().uuid(),
  records: z.array(markRecordSchema).min(1),
});

export const noticeSchema = z.discriminatedUnion("audience", [
  z.object({
    audience: z.literal("SCHOOL"),
    title: z.string().trim().min(2).max(80),
    body: z.string().trim().min(2).max(1000),
  }),
  z.object({
    audience: z.literal("GRADE"),
    title: z.string().trim().min(2).max(80),
    body: z.string().trim().min(2).max(1000),
    gradeId: z.string().uuid(),
  }),
]);

export type LoginInput = z.infer<typeof loginSchema>;
export type AttendanceSubmitInput = z.infer<typeof attendanceSubmitSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryStatusInput = z.infer<typeof enquiryStatusSchema>;
export type EnrolInput = z.infer<typeof enrolSchema>;
export type ExamInput = z.infer<typeof examSchema>;
export type MarksSubmitInput = z.infer<typeof marksSubmitSchema>;
export type NoticeInput = z.infer<typeof noticeSchema>;

export const certificateSchema = z.object({
  studentId: z.string().uuid(),
  purpose: z.string().trim().min(2).max(120),
});

export type CertificateInput = z.infer<typeof certificateSchema>;

export const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
export type Weekday = (typeof weekdays)[number];

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const timetablePeriodSchema = z.object({
  day: z.enum(weekdays),
  startTime: clockTime,
  endTime: clockTime,
  subject: z.string().trim().min(2).max(40),
});

export const timetableSchema = z.object({
  sectionId: z.string().uuid(),
  periods: z.array(timetablePeriodSchema).max(40),
});

export type TimetableInput = z.infer<typeof timetableSchema>;
