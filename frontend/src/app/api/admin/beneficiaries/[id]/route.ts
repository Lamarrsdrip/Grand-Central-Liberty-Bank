import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { ip, userAgent } = await requestIpAndAgent();

    await prisma.$runCommandRaw({
      delete: "SavedBeneficiary",
      deletes: [{ q: { _id: { $oid: id } }, limit: 1 }],
      writeConcern: { w: 1 }
    });

    await auditLog({
      actorId: admin.id,
      action: "ADMIN_DELETED_BENEFICIARY",
      entity: "SavedBeneficiary",
      entityId: id,
      ip,
      userAgent
    });

    return ok({ ok: true });
  });
}
