import { Prisma } from "@prisma/client";

export const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  country: true,
  address: true,
  dateOfBirth: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  twoFactorEnabled: true,
  preferredLocale: true,
  preferredCurrency: true,
  themePreference: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;
