import { z } from "zod";

export const registrationSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  country: z.string().min(2),
  address: z.string().min(8),
  dateOfBirth: z.string().min(8),
  password: z.string().min(12)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorToken: z.string().optional()
});

export const kycSchema = z.object({
  documentType: z.enum(["PASSPORT", "DRIVER_LICENSE", "NATIONAL_ID", "SELFIE"]),
  documentUrl: z.string().min(1),
  selfieUrl: z.string().min(1)
});

export const cardApplicationSchema = z.object({
  type: z.enum(["CLASSIC", "GOLD", "PLATINUM", "SIGNATURE"]),
  occupation: z.string().min(2),
  annualIncome: z.coerce.number().positive(),
  employer: z.string().min(2),
  address: z.string().min(8),
  governmentIdUrl: z.string().min(1)
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  type: z.enum(["INTERNAL", "DOMESTIC", "INTERNATIONAL"]),
  beneficiaryName: z.string().min(2),
  beneficiaryBank: z.string().optional(),
  beneficiaryAccount: z.string().optional(),
  ibanSwift: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  purpose: z.string().min(3)
});

export const ticketSchema = z.object({
  subject: z.string().min(3),
  body: z.string().min(1),
  attachmentUrl: z.string().optional()
});

export const messageSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1),
  attachmentUrl: z.string().optional()
});

export const retirementWithdrawalSchema = z.object({
  retirementAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  reason: z.string().min(8)
});
