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

export type LoginInput = z.infer<typeof loginSchema>;
export type AttendanceSubmitInput = z.infer<typeof attendanceSubmitSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryStatusInput = z.infer<typeof enquiryStatusSchema>;
export type EnrolInput = z.infer<typeof enrolSchema>;
