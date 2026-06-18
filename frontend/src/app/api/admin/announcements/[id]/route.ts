import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(2).optional(),
  body: z.string().min(3).optional(),
  tone: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]).optional(),
  href: z.string().optional().nullable(),
  audience: z.enum(["USER", "ADMIN"]).optional().nullable(),
  locale: z.enum(["en", "es", "fr"]).optional(),
  active: z.boolean().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const announcement = await prisma.announcementBanner.update({
      where: { id },
      data: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : input.startsAt === null ? null : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : input.endsAt === null ? null : undefined
      }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_ANNOUNCEMENT",
      entity: "AnnouncementBanner",
      entityId: id,
      metadata: input,
      ip,
      userAgent
    });

    return ok({ announcement });
  });
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { ip, userAgent } = await requestIpAndAgent();
    await prisma.announcementBanner.delete({ where: { id } });
    await auditLog({ actorId: admin.id, action: "ADMIN_DELETED_ANNOUNCEMENT", entity: "AnnouncementBanner", entityId: id, ip, userAgent });
    return ok({ ok: true });
  });
}
