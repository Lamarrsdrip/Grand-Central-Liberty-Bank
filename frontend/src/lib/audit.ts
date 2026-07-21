import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
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
    await prisma.$runCommandRaw({
      insert: "AuditLog",
      documents: [
        {
          _id: { $oid: randomBytes(12).toString("hex") },
          actorId: input.actorId ? { $oid: input.actorId } : null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          metadata: input.metadata ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          createdAt: { $date: new Date().toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
  } catch (error) {
    console.error("[audit] auditLog failed - action:", input.action, error);
  }
}

export async function notifyUser(userId: string, input: { type: string; title: string; body: string }) {
  try {
    await prisma.$runCommandRaw({
      insert: "Notification",
      documents: [
        {
          _id: { $oid: randomBytes(12).toString("hex") },
          userId: { $oid: userId },
          type: input.type,
          title: input.title,
          body: input.body,
          readAt: null,
          createdAt: { $date: new Date().toISOString() }
        }
      ],
      writeConcern: { w: 1 }
    });
  } catch (error) {
    console.error("[audit] notifyUser failed - userId:", userId, "type:", input.type, error);
  }
}
