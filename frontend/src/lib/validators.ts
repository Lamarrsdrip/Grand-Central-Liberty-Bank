import { z } from "zod";

export const registrationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email("Enter a valid email address"),
  // Accept international formats: +, spaces, dashes, parentheses, 6–20 digits
  phone: z
    .string()
    .trim()
    .min(6, "Phone number must be at least 6 digits")
    .max(30, "Phone number is too long")
    .regex(/^[+\d][\d\s\-().]{4,}$/, "Enter a valid phone number"),
  country: z.string().min(1, "Select your country"),
  address: z.string().trim().min(5, "Enter your full address").max(200),
  dateOfBirth: z.string().min(8, "Date of birth is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
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
  address: z.string().min(5),
  governmentIdUrl: z.string().min(1)
});

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  type: z.enum(["INTERNAL", "DOMESTIC", "INTERNATIONAL"]),
  beneficiaryName: z.string().trim().min(2, "Recipient full name is required"),
  beneficiaryBank: z.string().trim().min(1, "Bank name is required"),
  beneficiaryAccount: z.string().trim().min(4, "Account number / IBAN is required"),
  ibanSwift: z.string().trim().optional(),
  recipientCountry: z.string().min(1, "Recipient country is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required").default("USD"),
  purpose: z.string().trim().min(2, "Transfer purpose is required"),
  saveBeneficiary: z.boolean().optional().default(false),
  beneficiaryNickname: z.string().trim().optional()
});

export const beneficiarySchema = z.object({
  recipientName: z.string().trim().min(2, "Recipient name is required"),
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountNumber: z.string().trim().min(4, "Account number is required"),
  routingSwift: z.string().trim().optional(),
  recipientCountry: z.string().min(1, "Country is required"),
  currency: z.string().default("USD"),
  nickname: z.string().trim().optional()
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
  reason: z.string().min(5)
});
