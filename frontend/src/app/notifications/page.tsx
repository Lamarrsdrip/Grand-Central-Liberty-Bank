import { redirect } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { NotificationsClient } from "@/components/banking/notifications-client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <ProtectedShell>
      <div className="max-w-2xl mx-auto space-y-5 fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Notifications</h1>
            <p className="text-sm text-white/50 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <NotificationsClient notifications={notifications} showMarkAll />
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="card-dark p-12 text-center">
            <div className="size-16 rounded-full bg-white/5 border border-dashed border-white/15 flex items-center justify-center mx-auto mb-4">
              <BellOff className="size-7 text-white/25" />
            </div>
            <p className="font-black text-white">No notifications yet</p>
            <p className="text-sm text-white/40 mt-1">We&apos;ll notify you about account activity and updates here.</p>
          </div>
        ) : (
          <NotificationsClient notifications={notifications} />
        )}
      </div>
    </ProtectedShell>
  );
}
