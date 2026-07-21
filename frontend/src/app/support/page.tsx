import { redirect } from "next/navigation";
import { Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { SupportCenter } from "@/components/banking/workflow-forms";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { PageHeader } from "@/components/banking/premium-ui";
import { getCurrentUser } from "@/lib/auth";
import { getUserSupportTickets } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supportTickets = await getUserSupportTickets(user.id);
  const tickets = supportTickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    assignedAdmin: ticket.assignedAdmin
      ? {
          id: ticket.assignedAdmin.id,
          name: `${ticket.assignedAdmin.firstName} ${ticket.assignedAdmin.lastName}`,
          email: ticket.assignedAdmin.email
        }
      : null,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      createdAt: message.createdAt.toISOString(),
      attachmentUrl: message.attachmentUrl,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      senderRole: message.sender.role
    }))
  }));

  return (
    <ProtectedShell>
      <div className="grid gap-8 soft-appear">
        <PageHeader
          title="Support that feels live."
          description="Open tickets, upload files, and chat with Grand Central Liberty Bank support in real time."
        />
        <section className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Live chat", body: "Start a conversation and keep the full message history.", icon: Headphones },
            { title: "Secure documents", body: "Send files into the same protected banking workflow.", icon: ShieldCheck },
            { title: "Priority help", body: "Unread replies trigger notifications across the app.", icon: Sparkles }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="premium-hover glass-panel rounded-[1.5rem] p-5">
                <Icon className="text-primary" data-icon="inline-start" />
                <h2 className="mt-5 text-xl font-black">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </section>
        <SupportCenter initialTickets={tickets} userId={user.id} />
      </div>
    </ProtectedShell>
  );
}
