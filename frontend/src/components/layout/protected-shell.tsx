import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { getAnnouncements } from "@/lib/data";

export async function ProtectedShell({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (adminOnly && user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  const announcements = await getAnnouncements(user.role, user.preferredLocale);

  return (
    <AppShell user={user} announcements={announcements}>
      {children}
    </AppShell>
  );
}
