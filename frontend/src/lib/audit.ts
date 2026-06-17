import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function auditLog(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null
      }
    });
  } catch (error) {
    console.error("[audit] auditLog failed — action:", input.action, error);
  }
}

export async function notifyUser(userId: string, input: { type: string; title: string; body: string }) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type as never,
        title: input.title,
        body: input.body
      }
    });
  } catch (error) {
    console.error("[audit] notifyUser failed — userId:", userId, "type:", input.type, error);
  }
}
