import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  country: z.string().min(2).optional(),
  address: z.string().min(8).optional()
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        address: true,
        dateOfBirth: true,
        emailVerifiedAt: true,
        twoFactorEnabled: true,
        preferredLocale: true,
        themePreference: true,
        status: true,
        loginHistory: { orderBy: { createdAt: "desc" }, take: 10 }
      }
    });

    return ok({ profile });
  });
}

export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const profile = await prisma.user.update({
      where: { id: user.id },
      data: input,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        address: true
      }
    });
    await auditLog({ actorId: user.id, action: "PROFILE_UPDATED", entity: "User", entityId: user.id });

    return ok({ profile });
  });
}
