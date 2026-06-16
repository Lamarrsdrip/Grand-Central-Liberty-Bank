import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultTransferSettings } from "@/lib/domain";

const schema = z.object({
  reviewMessage: z.string().min(10),
  buttonText: z.string().min(2),
  supportInstructions: z.string().min(10)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const settings = await prisma.transferSetting.findUnique({ where: { id: 1 } });
    return ok({ settings: settings ?? defaultTransferSettings });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const settings = await prisma.transferSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_TRANSFER_SETTINGS",
      entity: "TransferSetting",
      entityId: "1",
      metadata: input,
      ip,
      userAgent
    });

    return ok({ settings });
  });
}
