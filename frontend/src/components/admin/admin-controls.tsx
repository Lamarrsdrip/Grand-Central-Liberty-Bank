"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoIcon } from "@/components/banking/crypto-icons";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";

function Notice({ message }: { message: string }) {
  return message ? <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold">{message}</p> : null;
}

async function uploadAdminFile(file: File, folder: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  const response = await secureFetch("/api/upload", { method: "POST", body: form });
  return response.url as string;
}

export function AdminJsonForm({
  title,
  description,
  endpoint,
  method = "PATCH",
  children,
  buttonLabel,
  confirmMessage,
  buttonVariant = "default"
}: {
  title?: string;
  description?: string;
  endpoint: string;
  method?: string;
  children: React.ReactNode;
  buttonLabel: string;
  confirmMessage?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) {
          return;
        }
        const form = new FormData(event.currentTarget);
        const data: Record<string, unknown> = {};
        form.forEach((value, key) => {
          if (key.endsWith("[]")) {
            const cleanKey = key.slice(0, -2);
            data[cleanKey] = [...((data[cleanKey] as string[]) ?? []), String(value)];
          } else if (value !== "") {
            if (value === "true" || value === "false") data[key] = value === "true";
            else data[key] = value;
          }
        });
        try {
          await secureFetch(endpoint, { method, body: JSON.stringify(data) });
          setMessage("Saved.");
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Action failed.");
        }
      }}
    >
      {title ? (
        <div>
          <p className="font-black">{title}</p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <Notice message={message} />
      {children}
      <Button size="sm" variant={buttonVariant}>{buttonLabel}</Button>
    </form>
  );
}

export function UserStatusControl({ userId }: { userId: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/users/${userId}`} buttonLabel="Apply status">
      <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
        <Select name="action" defaultValue="FREEZE">
          <option value="FREEZE">Freeze</option>
          <option value="UNFREEZE">Unfreeze</option>
          <option value="SUSPEND">Suspend</option>
          <option value="ACTIVATE">Activate</option>
        </Select>
        <Input name="reason" placeholder="Required reason" required />
      </div>
    </AdminJsonForm>
  );
}

export function UserProfileEditControl({
  user
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    address: string;
  };
}) {
  return (
    <AdminJsonForm endpoint={`/api/admin/users/${user.id}`} buttonLabel="Save user profile">
      <input type="hidden" name="action" value="EDIT_PROFILE" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field><Label>First name</Label><Input name="firstName" defaultValue={user.firstName} required /></Field>
        <Field><Label>Last name</Label><Input name="lastName" defaultValue={user.lastName} required /></Field>
        <Field><Label>Email</Label><Input name="email" type="email" defaultValue={user.email} required /></Field>
        <Field><Label>Phone</Label><Input name="phone" defaultValue={user.phone} required /></Field>
        <Field><Label>Country</Label><Input name="country" defaultValue={user.country} required /></Field>
        <Field><Label>Address</Label><Input name="address" defaultValue={user.address} required /></Field>
        <Field className="sm:col-span-2"><Label>Reason</Label><Input name="reason" placeholder="Required audit reason" required /></Field>
      </div>
    </AdminJsonForm>
  );
}

export function KycDecisionControl({ id }: { id: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/kyc/${id}`} buttonLabel="Update KYC">
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
        <Select name="status" defaultValue="UNDER_REVIEW">
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
          <option value="INFO_REQUESTED">Request Document</option>
        </Select>
        <Input name="note" placeholder="Verification note" required />
      </div>
      <input type="hidden" name="visibleToUser" value="true" />
    </AdminJsonForm>
  );
}

export function CardDecisionControl({ id }: { id: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/cards/${id}`} buttonLabel="Update card">
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
        <Select name="status" defaultValue="UNDER_REVIEW">
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
          <option value="INFO_REQUESTED">Request Info</option>
        </Select>
        <Input name="adminNote" placeholder="Decision note" required />
      </div>
    </AdminJsonForm>
  );
}

export function TransferDecisionControl({ id }: { id: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/transfers/${id}`} buttonLabel="Update transfer">
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
        <Select name="status" defaultValue="UNDER_REVIEW">
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
          <option value="CANCELLED">Cancel</option>
        </Select>
        <Input name="adminNote" placeholder="Transfer note" required />
      </div>
    </AdminJsonForm>
  );
}

export function RetirementWithdrawalDecisionControl({ id }: { id: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/retirement/withdrawals/${id}`} buttonLabel="Update 401(k)">
      <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
        <Select name="status" defaultValue="UNDER_REVIEW">
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
          <option value="INFO_REQUESTED">Request Documents</option>
        </Select>
        <Input name="internalNote" placeholder="Internal compliance note" required />
      </div>
      <Input name="userNote" placeholder="Optional user-visible note" />
    </AdminJsonForm>
  );
}

export function RetirementFeeSettingsForm({
  settings
}: {
  settings: {
    feeName: string;
    feePercentage: unknown;
    feeReason: string;
    paymentMethod: string;
    enabled: boolean;
    complianceMessage: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>401(k) Compliance Fees</CardTitle>
        <CardDescription>Crypto deposit fee disclosure required before withdrawal submission.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/retirement/fee-settings" method="PUT" buttonLabel="Save 401(k) settings">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><Label>Fee name</Label><Input name="feeName" defaultValue={settings.feeName} required /></Field>
            <Field><Label>Fee percentage</Label><Input name="feePercentage" type="number" step="0.01" defaultValue={String(settings.feePercentage)} required /></Field>
            <Field><Label>Payment method</Label><Input name="paymentMethod" defaultValue={settings.paymentMethod} required /></Field>
            <Field><Label>Enabled</Label><Select name="enabled" defaultValue={String(settings.enabled)}><option value="true">Enabled</option><option value="false">Disabled</option></Select></Field>
            <Field className="sm:col-span-2"><Label>Fee reason</Label><Textarea name="feeReason" defaultValue={settings.feeReason} required /></Field>
            <Field className="sm:col-span-2"><Label>Compliance message</Label><Textarea name="complianceMessage" defaultValue={settings.complianceMessage} required /></Field>
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function SupportStatusControl({ id }: { id: string }) {
  return (
    <AdminJsonForm endpoint={`/api/admin/support/${id}`} buttonLabel="Update ticket">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select name="status" defaultValue="ACTIVE">
          <option value="OPEN">Open</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Select name="priority" defaultValue="NORMAL">
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
        <input type="hidden" name="assignToMe" value="true" />
        <span className="text-sm font-semibold text-muted-foreground">Assign to me</span>
      </div>
    </AdminJsonForm>
  );
}

type AdminSupportTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  assignedAdmin?: { id: string; firstName: string; lastName: string; email: string } | null;
  messages: Array<{
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    attachmentUrl?: string | null;
    senderName?: string;
    senderRole?: string;
  }>;
};

function appendSupportMessage(
  tickets: AdminSupportTicket[],
  ticketId: string,
  message: AdminSupportTicket["messages"][number]
) {
  return tickets.map((ticket) => {
    if (ticket.id !== ticketId || ticket.messages.some((item) => item.id === message.id)) {
      return ticket;
    }

    return { ...ticket, status: ticket.status === "CLOSED" ? ticket.status : "ACTIVE", messages: [...ticket.messages, message] };
  });
}

export function AdminSupportCenter({
  tickets: initialTickets,
  adminId
}: {
  tickets: AdminSupportTicket[];
  adminId: string;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState(initialTickets[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId), [activeId, tickets]);

  useEffect(() => setTickets(initialTickets), [initialTickets]);

  useEffect(() => {
    if (!activeId) return;
    const nextSocket = io({ path: "/socket.io" });
    setSocket(nextSocket);
    nextSocket.emit("join_ticket", activeId);
    nextSocket.on("support_message", (incoming: { ticketId: string; message: AdminSupportTicket["messages"][number] }) => {
      setTickets((current) => appendSupportMessage(current, incoming.ticketId, incoming.message));
    });
    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [activeId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Support Desk</CardTitle>
        <CardDescription>Open chats, reply as an admin, assign tickets, and close or reopen conversations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveId(ticket.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  ticket.id === activeId ? "border-emerald-300/50 bg-emerald-400/12" : "border-white/10 bg-white/5 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-black text-white">{ticket.user.firstName} {ticket.user.lastName}</p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-black text-white/70">{ticket.status}</span>
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{ticket.subject}</p>
                <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-wider text-white/35">
                  {ticket.messages.length} messages · {ticket.priority}
                </p>
              </button>
            ))}
            {!tickets.length ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-muted-foreground">
                No support conversations yet.
              </p>
            ) : null}
          </div>

          <div className="min-w-0 rounded-3xl border border-white/10 bg-black/18 p-4">
            {activeTicket ? (
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white">{activeTicket.subject}</p>
                    <p className="text-sm text-muted-foreground">{activeTicket.user.email}</p>
                    <p className="mt-1 text-xs text-white/35">
                      Assigned: {activeTicket.assignedAdmin ? `${activeTicket.assignedAdmin.firstName} ${activeTicket.assignedAdmin.lastName}` : "Unassigned"}
                    </p>
                  </div>
                  <div className="w-full lg:w-[22rem]">
                    <SupportStatusControl id={activeTicket.id} />
                  </div>
                </div>

                <div className="max-h-[26rem] min-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0f18] p-4">
                  {activeTicket.messages.map((message) => {
                    const mine = message.senderId === adminId;
                    return (
                      <div
                        key={message.id}
                        className={`mb-3 max-w-[88%] rounded-2xl p-3 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-white/8 text-white"}`}
                      >
                        <p className={`mb-1 text-[0.65rem] font-black ${mine ? "text-black/55" : "text-white/40"}`}>
                          {mine ? "You" : message.senderName ?? activeTicket.user.firstName}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        {message.attachmentUrl ? (
                          <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-black underline">
                            View attachment
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <form
                  className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_14rem_auto]"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const body = reply.trim();
                    if ((!body && !replyFile) || !activeTicket) return;
                    setBusy(true);
                    try {
                      const attachmentUrl = replyFile ? await uploadAdminFile(replyFile, "support-attachments") : undefined;
                      const finalBody = body || "Attachment uploaded";
                      if (socket?.connected && !attachmentUrl) {
                        await new Promise<void>((resolve, reject) => {
                          socket.emit(
                            "send_support_message",
                            { ticketId: activeTicket.id, body: finalBody },
                            (response: { error?: string; message?: AdminSupportTicket["messages"][number] }) => {
                              if (response?.error) {
                                reject(new Error(response.error));
                                return;
                              }
                              if (response?.message) {
                                setTickets((current) => appendSupportMessage(current, activeTicket.id, response.message!));
                              }
                              resolve();
                            }
                          );
                        });
                      } else {
                        const data = await secureFetch("/api/support/messages", {
                          method: "POST",
                          body: JSON.stringify({ ticketId: activeTicket.id, body: finalBody, attachmentUrl })
                        });
                        setTickets((current) => appendSupportMessage(current, activeTicket.id, {
                          ...data.message,
                          senderName: "You",
                          senderRole: "ADMIN"
                        }));
                      }
                      setReply("");
                      setReplyFile(null);
                      event.currentTarget.reset();
                    } catch (error) {
                      window.alert(error instanceof Error ? error.message : "Reply failed. Please try again.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to this customer..." className="min-h-14" />
                  <Input type="file" onChange={(event) => setReplyFile(event.target.files?.[0] ?? null)} />
                  <Button type="submit" disabled={busy || (!reply.trim() && !replyFile)} className="h-full min-h-14">
                    <Send data-icon="inline-start" />
                    Reply
                  </Button>
                </form>
              </div>
            ) : (
              <p className="py-16 text-center text-sm font-semibold text-muted-foreground">Select a support ticket to begin.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WalletForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Crypto Wallet</CardTitle>
        <CardDescription>Enabled wallets appear globally to users.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/wallets" method="POST" buttonLabel="Add wallet">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><Label>Coin</Label><Input name="coin" placeholder="Bitcoin" required /></Field>
            <Field><Label>Symbol</Label><Input name="symbol" placeholder="BTC" required /></Field>
            <Field><Label>Network</Label><Input name="network" placeholder="Bitcoin" required /></Field>
            <Field><Label>Label</Label><Input name="label" placeholder="Treasury wallet" required /></Field>
            <Field className="sm:col-span-2"><Label>Address</Label><Input name="address" required /></Field>
            <Field className="sm:col-span-2"><Label>QR code URL</Label><Input name="qrCodeUrl" /></Field>
            <Field className="sm:col-span-2"><Label>Deposit instructions</Label><Textarea name="depositInstructions" placeholder="Network-specific instructions shown to users" /></Field>
            <input type="hidden" name="enabled" value="true" />
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

type WalletRecord = {
  id: string;
  coin: string;
  symbol: string;
  address: string;
  network: string;
  label: string;
  qrCodeUrl?: string | null;
  depositInstructions?: string | null;
  enabled: boolean;
};

export function WalletManagementPanel({ wallets }: { wallets: WalletRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Wallet Infrastructure</CardTitle>
        <CardDescription>Add, edit, enable, disable, and delete global wallet addresses.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {wallets.map((wallet) => (
          <div key={wallet.id} className="rounded-2xl border p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CryptoIcon symbol={wallet.symbol} className="size-11" />
                <div>
                <p className="font-black">{wallet.coin} ({wallet.symbol})</p>
                <p className="break-all text-xs text-muted-foreground">{wallet.network} - {wallet.address}</p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${wallet.enabled ? "bg-emerald-400/15 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                {wallet.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <AdminJsonForm endpoint={`/api/admin/wallets/${wallet.id}`} buttonLabel="Save wallet">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field><Label>Coin</Label><Input name="coin" defaultValue={wallet.coin} required /></Field>
                <Field><Label>Symbol</Label><Input name="symbol" defaultValue={wallet.symbol} required /></Field>
                <Field><Label>Network</Label><Input name="network" defaultValue={wallet.network} required /></Field>
                <Field><Label>Label</Label><Input name="label" defaultValue={wallet.label} required /></Field>
                <Field className="sm:col-span-2"><Label>Address</Label><Input name="address" defaultValue={wallet.address} required /></Field>
                <Field className="sm:col-span-2"><Label>QR code URL</Label><Input name="qrCodeUrl" defaultValue={wallet.qrCodeUrl ?? ""} /></Field>
                <Field className="sm:col-span-2"><Label>Deposit instructions</Label><Textarea name="depositInstructions" defaultValue={wallet.depositInstructions ?? ""} /></Field>
                <Field><Label>Status</Label><Select name="enabled" defaultValue={String(wallet.enabled)}><option value="true">Enabled</option><option value="false">Disabled</option></Select></Field>
              </div>
            </AdminJsonForm>
            <div className="mt-3">
              <AdminJsonForm
                endpoint={`/api/admin/wallets/${wallet.id}`}
                method="DELETE"
                buttonLabel="Delete wallet"
                buttonVariant="destructive"
                confirmMessage={`Delete ${wallet.symbol} ${wallet.network} wallet?`}
              >
                <p className="text-xs text-muted-foreground">Deleting removes this wallet from all user deposit screens immediately.</p>
              </AdminJsonForm>
            </div>
          </div>
        ))}
        {!wallets.length ? <p className="rounded-2xl border p-4 text-sm text-muted-foreground">No wallets configured yet.</p> : null}
      </CardContent>
    </Card>
  );
}

export function BalanceAdjustmentForm({
  users
}: {
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accounts: Array<{ id: string; type: string; accountNumber: string; balance: unknown; availableBalance: unknown; currency: string }>;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Adjustment</CardTitle>
        <CardDescription>Top up or deduct account balances with a required reason and audit trail.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm
          endpoint="/api/admin/accounts/adjust-balance"
          method="POST"
          buttonLabel="Review and apply adjustment"
          confirmMessage="Apply this balance adjustment? This creates an audit log and user-visible transaction."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label>User</Label>
              <Select name="userId" required>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.email}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Account</Label>
              <Select name="accountId" required>
                {users.flatMap((user) =>
                  user.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {user.email} - {account.type} •••• {account.accountNumber.slice(-4)} ({account.currency} {String(account.availableBalance)})
                    </option>
                  ))
                )}
              </Select>
            </Field>
            <Field>
              <Label>Action</Label>
              <Select name="action" defaultValue="TOP_UP">
                <option value="TOP_UP">Top up</option>
                <option value="DEDUCT">Deduct</option>
              </Select>
            </Field>
            <Field><Label>Amount</Label><Input name="amount" type="number" step="0.01" min="0.01" required /></Field>
            <Field><Label>Allow negative balance</Label><Select name="allowNegative" defaultValue="false"><option value="false">No</option><option value="true">Yes, authorized</option></Select></Field>
            <Field className="sm:col-span-2"><Label>Reason</Label><Textarea name="reason" required placeholder="Required operational reason shown in audit logs and user activity" /></Field>
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function TransferSettingsForm({ settings }: { settings: {
  successMessage?: string;
  reviewMessage: string;
  failedMessage?: string;
  blockedMessage?: string;
  reasonText?: string;
  buttonText: string;
  supportInstructions: string;
  referencePrefix?: string;
} }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Message</CardTitle>
        <CardDescription>Change transfer review messaging without code changes.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/transfer-settings" method="PUT" buttonLabel="Save transfer settings">
          <Field><Label>Success message</Label><Textarea name="successMessage" defaultValue={settings.successMessage ?? "Transfer submitted successfully."} required /></Field>
          <Field><Label>Review message</Label><Textarea name="reviewMessage" defaultValue={settings.reviewMessage} required /></Field>
          <Field><Label>Failed message</Label><Textarea name="failedMessage" defaultValue={settings.failedMessage ?? "Transfer could not be submitted. Additional verification is required before this transaction can be completed."} required /></Field>
          <Field><Label>Blocked message</Label><Textarea name="blockedMessage" defaultValue={settings.blockedMessage ?? "Transfer is blocked until additional account verification is completed."} required /></Field>
          <Field><Label>Reason text</Label><Textarea name="reasonText" defaultValue={settings.reasonText ?? "Additional verification is required before this transaction can be completed."} required /></Field>
          <Field><Label>Button text</Label><Input name="buttonText" defaultValue={settings.buttonText} required /></Field>
          <Field><Label>Support instructions</Label><Textarea name="supportInstructions" defaultValue={settings.supportInstructions} required /></Field>
          <Field><Label>Reference prefix</Label><Input name="referencePrefix" defaultValue={settings.referencePrefix ?? "GCLB"} required /></Field>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function EmailSettingsForm({ settings }: { settings: Record<string, unknown> | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>Gmail SMTP with Google App Password support.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/email-settings" method="PUT" buttonLabel="Save SMTP settings">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><Label>Gmail address</Label><Input name="gmailAddress" type="email" defaultValue={String(settings?.gmailAddress ?? "")} /></Field>
            <Field><Label>App password</Label><Input name="appPassword" type="password" placeholder={settings?.appPasswordEncrypted ? "Configured" : ""} /></Field>
            <Field><Label>SMTP host</Label><Input name="smtpHost" defaultValue={String(settings?.smtpHost ?? "smtp.gmail.com")} required /></Field>
            <Field><Label>SMTP port</Label><Input name="smtpPort" type="number" defaultValue={String(settings?.smtpPort ?? 465)} required /></Field>
            <Field><Label>Sender name</Label><Input name="senderName" defaultValue={String(settings?.senderName ?? "Grand Central Liberty Bank")} required /></Field>
            <Field><Label>Secure</Label><Select name="smtpSecure" defaultValue={String(settings?.smtpSecure ?? true)}><option value="true">Enabled</option><option value="false">Disabled</option></Select></Field>
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function TestEmailForm() {
  return (
    <AdminJsonForm title="Test Email" description="Send a live SMTP test." endpoint="/api/admin/email-test" method="POST" buttonLabel="Send test">
      <Input name="to" type="email" placeholder="recipient@example.com" required />
    </AdminJsonForm>
  );
}

export function BroadcastForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotional Email Broadcast</CardTitle>
        <CardDescription>Send promotions, newsletters, and announcements to user segments.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/broadcasts" method="POST" buttonLabel="Send broadcast">
          <Field><Label>Subject</Label><Input name="subject" required /></Field>
          <Field><Label>Target</Label><Select name="target" defaultValue="ALL_USERS"><option value="ALL_USERS">All users</option><option value="APPROVED_USERS">Approved users</option><option value="KYC_PENDING_USERS">KYC pending users</option><option value="SELECTED_USERS">Selected users</option></Select></Field>
          <Field><Label>Selected user IDs</Label><Input name="selectedUserIds[]" placeholder="Use one selected user ID per repeated field" /></Field>
          <Field><Label>Rich text HTML</Label><Textarea name="bodyHtml" required /></Field>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function BankSettingsForm({ settings }: { settings: Record<string, unknown> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Settings</CardTitle>
        <CardDescription>Global bank profile, policies, and language settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/settings" method="PUT" buttonLabel="Save bank settings">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><Label>Bank name</Label><Input name="bankName" defaultValue={String(settings.bankName)} required /></Field>
            <Field><Label>Website URL</Label><Input name="websiteUrl" defaultValue={String(settings.websiteUrl)} required /></Field>
            <Field><Label>Support email</Label><Input name="supportEmail" type="email" defaultValue={String(settings.supportEmail)} required /></Field>
            <Field><Label>Support phone</Label><Input name="supportPhone" defaultValue={String(settings.supportPhone)} required /></Field>
            <Field><Label>Default locale</Label><Select name="defaultLocale" defaultValue={String(settings.defaultLocale)}>{SUPPORTED_LOCALES.map((code) => (<option key={code} value={code}>{LOCALE_LABELS[code as SupportedLocale]}</option>))}</Select></Field>
            <Field>
              <Label>401(k) welcome bonus</Label>
              <Input name="welcomeBonusAmount" type="number" min="0" step="0.01" defaultValue={String(settings.welcomeBonusAmount ?? 500)} />
            </Field>
            <Field>
              <Label>Welcome bonus status</Label>
              <Select name="welcomeBonusEnabled" defaultValue={String(settings.welcomeBonusEnabled ?? true)}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </Select>
            </Field>
            {SUPPORTED_LOCALES.map((code) => (<input key={code} type="hidden" name="supportedLocales[]" value={code} />))}
            <Field className="sm:col-span-2"><Label>Bank address</Label><Input name="bankAddress" defaultValue={String(settings.bankAddress)} required /></Field>
            <p className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-3 text-xs font-semibold leading-5 text-emerald-100 sm:col-span-2">
              The welcome bonus is credited only to new user 401(k) retirement accounts as a contribution record. Checking, savings, crypto, and card balances are not credited.
            </p>
            <Field className="sm:col-span-2"><Label>Terms</Label><Textarea name="terms" defaultValue={String(settings.terms)} required /></Field>
            <Field className="sm:col-span-2"><Label>Privacy policy</Label><Textarea name="privacyPolicy" defaultValue={String(settings.privacyPolicy)} required /></Field>
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function AnnouncementForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcement Banner</CardTitle>
        <CardDescription>Create mobile and desktop account alerts.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/announcements" method="POST" buttonLabel="Publish banner">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field><Label>Title</Label><Input name="title" required /></Field>
            <Field><Label>Tone</Label><Select name="tone" defaultValue="INFO"><option value="INFO">Info</option><option value="SUCCESS">Success</option><option value="WARNING">Warning</option><option value="CRITICAL">Critical</option></Select></Field>
            <Field><Label>Audience</Label><Select name="audience" defaultValue=""><option value="">All roles</option><option value="USER">Users</option><option value="ADMIN">Admins</option></Select></Field>
            <Field><Label>Locale</Label><Select name="locale" defaultValue="en"><option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option></Select></Field>
            <Field className="sm:col-span-2"><Label>Body</Label><Textarea name="body" required /></Field>
            <Field className="sm:col-span-2"><Label>Link</Label><Input name="href" placeholder="/support" /></Field>
            <input type="hidden" name="active" value="true" />
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function AnnouncementToggleControl({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="flex gap-2">
      <AdminJsonForm
        endpoint={`/api/admin/announcements/${id}`}
        method="PATCH"
        buttonLabel={active ? "Deactivate" : "Activate"}
        buttonVariant={active ? "outline" : "default"}
      >
        <input type="hidden" name="active" value={String(!active)} />
      </AdminJsonForm>
      <AdminJsonForm
        endpoint={`/api/admin/announcements/${id}`}
        method="DELETE"
        buttonLabel="Delete"
        buttonVariant="destructive"
        confirmMessage="Permanently delete this announcement banner?"
      >
        <span />
      </AdminJsonForm>
    </div>
  );
}

export function AdminNotificationForm({
  users
}: {
  users: Array<{ id: string; firstName: string; lastName: string; email: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Notification</CardTitle>
        <CardDescription>Push an in-app notification to a specific user or every user.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/notify" method="POST" buttonLabel="Send notification">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label>Target</Label>
              <Select name="target" defaultValue="USER">
                <option value="USER">Specific user</option>
                <option value="ALL">All users</option>
              </Select>
            </Field>
            <Field>
              <Label>User</Label>
              <Select name="userId">
                <option value="">— all users —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.email}</option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Type</Label>
              <Select name="type" defaultValue="SYSTEM">
                <option value="SYSTEM">System</option>
                <option value="KYC_APPROVED">KYC Approved</option>
                <option value="KYC_REJECTED">KYC Rejected</option>
                <option value="TRANSFER_SUBMITTED">Transfer Update</option>
                <option value="ACCOUNT_FROZEN">Account Frozen</option>
                <option value="ACCOUNT_UNFROZEN">Account Unfrozen</option>
                <option value="LOGIN_ALERT">Login Alert</option>
              </Select>
            </Field>
            <Field><Label>Title</Label><Input name="title" required placeholder="e.g. Your account has been updated" /></Field>
            <Field className="sm:col-span-2"><Label>Message body</Label><Textarea name="body" required placeholder="Full notification text shown to the user" /></Field>
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function BeneficiaryDeleteControl({ id }: { id: string }) {
  return (
    <AdminJsonForm
      endpoint={`/api/admin/beneficiaries/${id}`}
      method="DELETE"
      buttonLabel="Remove"
      buttonVariant="destructive"
      confirmMessage="Remove this saved beneficiary? The user will no longer see it."
    >
      <span />
    </AdminJsonForm>
  );
}
