import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  coin: z.string().min(2).optional(),
  symbol: z.string().min(2).max(12).optional(),
  address: z.string().min(8).optional(),
  network: z.string().min(2).optional(),
  label: z.string().min(2).optional(),
  qrCodeUrl: z.string().optional().nullable(),
  depositInstructions: z.string().optional().nullable(),
  enabled: z.boolean().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const wallet = await prisma.cryptoWallet.update({ where: { id }, data: input });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_WALLET",
      entity: "CryptoWallet",
      entityId: id,
      metadata: input,
      ip,
      userAgent
    });

    return ok({ wallet });
  });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { ip, userAgent } = await requestIpAndAgent();
    await prisma.cryptoWallet.delete({ where: { id } });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_DELETED_WALLET",
      entity: "CryptoWallet",
      entityId: id,
      ip,
      userAgent
    });

    return ok({ deleted: true });
  });
}
