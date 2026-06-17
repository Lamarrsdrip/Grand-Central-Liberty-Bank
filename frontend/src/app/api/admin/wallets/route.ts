import { NextRequest } from "next/server";
import { z } from "zod";
import { created, handleApi, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { requireAdmin, requestIpAndAgent } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  coin: z.string().min(2),
  symbol: z.string().min(2).max(12),
  address: z.string().min(8),
  network: z.string().min(2),
  label: z.string().min(2),
  qrCodeUrl: z.string().optional(),
  depositInstructions: z.string().optional(),
  enabled: z.boolean().default(true)
});

export async function GET() {
  return handleApi(async () => {
    await requireAdmin();
    const wallets = await prisma.cryptoWallet.findMany({ orderBy: [{ symbol: "asc" }, { network: "asc" }] });
    return ok({ wallets });
  });
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const { ip, userAgent } = await requestIpAndAgent();
    const wallet = await prisma.cryptoWallet.create({ data: input });
    await auditLog({
      actorId: admin.id,
      action: "ADMIN_CREATED_WALLET",
      entity: "CryptoWallet",
      entityId: wallet.id,
      metadata: { symbol: wallet.symbol, network: wallet.network },
      ip,
      userAgent
    });

    return created({ wallet });
  });
}
