import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/lib/locales";

const SUPPORTED_CURRENCIES = [
  "USD","EUR","GBP","NGN","CAD","AUD","CHF","AED","GHS","ZAR","JPY","CNY","INR","BRL",
  "KRW","MXN","IDR","TRY","RUB","SEK","NOK","DKK","PLN","THB","SGD","HKD","NZD","MYR",
  "PHP","CZK","HUF","ILS","CLP","COP","PEN","ARS","EGP","PKR","BDT","VND","UAH","KES",
  "GBP","MAD","TND","XOF","XAF","ETB","TZS","UGX","RWF","ZMW","BWP",
];

const schema = z.object({
  preferredLocale: z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]).optional(),
  preferredCurrency: z.string().min(2).max(5).optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional()
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: { preferredLocale: true, preferredCurrency: true, themePreference: true }
    });
    return ok({ preferences: data });
  });
}

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    const updateData: { preferredLocale?: string; preferredCurrency?: string; themePreference?: string } = {};
    if (input.preferredLocale !== undefined) updateData.preferredLocale = input.preferredLocale;
    if (input.preferredCurrency !== undefined) updateData.preferredCurrency = input.preferredCurrency;
    if (input.themePreference !== undefined) updateData.themePreference = input.themePreference;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { preferredLocale: true, preferredCurrency: true, themePreference: true }
    });

    return ok({ preferences: updated });
  });
}
