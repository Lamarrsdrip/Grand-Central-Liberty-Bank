import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  title: z.string().min(2),
  body: z.string().min(3),
  tone: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]),
  href: z.string().optional().nullable(),
  audience: z.enum(["USER", "ADMIN"]).optional().nullable(),
  locale: z.enum(["en", "es", "fr"]).default("en"),
  active: z.boolean().default(true),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable()
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const announcements = await prisma.announcementBanner.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
    return ok({ announcements });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const announcement = await prisma.announcementBanner.create({
      data: {
        createdById: admin.id,
        title: input.title,
        body: input.body,
        tone: input.tone,
        href: input.href,
        audience: input.audience,
        locale: input.locale,
        active: input.active,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null
      }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_CREATED_ANNOUNCEMENT",
      entity: "AnnouncementBanner",
      entityId: announcement.id,
      metadata: { title: input.title, audience: input.audience, locale: input.locale },
      ip,
      userAgent
    });

    return created({ announcement });
  });
}
