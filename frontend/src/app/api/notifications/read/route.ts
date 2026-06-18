import { NextRequest } from "next/server";
import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await request.json();
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() }
    });
    return ok({ success: true });
  });
}
