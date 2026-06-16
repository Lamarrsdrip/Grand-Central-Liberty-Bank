import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/lib/locales";

const schema = z.object({
  preferredLocale: z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]).optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional()
});

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: input,
      select: { preferredLocale: true, themePreference: true }
    });

    return ok({ preferences: updated });
  });
}
