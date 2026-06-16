import { handleApi, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  return handleApi(async () => {
    const user = await requireUser();
    // `readAt` is omitted when notifications are created, so a Prisma+Mongo
    // filter of `{ readAt: null }` misses those records. Match unread by
    // negating the "already read" state instead.
    await prisma.notification.updateMany({
      where: { userId: user.id, NOT: { readAt: { gt: new Date(0) } } },
      data: { readAt: new Date() }
    });

    return ok({ success: true });
  });
}
