import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  feeName: z.string().min(3),
  feePercentage: z.coerce.number().min(0).max(100),
  feeReason: z.string().min(10),
  paymentMethod: z.string().min(3),
  enabled: z.boolean(),
  complianceMessage: z.string().min(20)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const settings = await prisma.retirementFeeSetting.findUnique({ where: { id: 1 } });
    return ok({ settings });
  });
}

export async function PUT(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const settings = await prisma.retirementFeeSetting.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input }
    });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_UPDATED_RETIREMENT_FEE_SETTINGS",
      entity: "RetirementFeeSetting",
      entityId: "1",
      metadata: {
        feeName: input.feeName,
        feePercentage: input.feePercentage,
        paymentMethod: input.paymentMethod,
        enabled: input.enabled
      },
      ip,
      userAgent
    });

    return ok({ settings });
  });
}
