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

export type LoginInput = z.infer<typeof loginSchema>;
export type AttendanceSubmitInput = z.infer<typeof attendanceSubmitSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
