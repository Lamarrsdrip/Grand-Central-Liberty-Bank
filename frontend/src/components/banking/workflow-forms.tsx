"use client";

import { Copy, Send, UploadCloud } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { calculateRetirementFee } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

type Account = { id: string; type: string; accountNumber: string; availableBalance: unknown; currency: string };
type TransferSettings = { reviewMessage: string; buttonText: string; supportInstructions: string };
type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  assignedAdmin?: { id: string; name: string; email: string } | null;
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
type RetirementAccount = {
  id: string;
  accountNumber: string;
  balance: unknown;
  vestedBalance: unknown;
  withdrawalEligibilityStatus: string;
  status: string;
};
type RetirementFeeSettings = {
  feeName: string;
  feePercentage: unknown;
  feeReason: string;
  paymentMethod: string;
  enabled: boolean;
  complianceMessage: string;
};

function Status({ message }: { message: string }) {
  return message ? <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold">{message}</p> : null;
}

function appendTicketMessage(tickets: Ticket[], ticketId: string, message: Ticket["messages"][number]) {
  return tickets.map((ticket) => {
    if (ticket.id !== ticketId || ticket.messages.some((item) => item.id === message.id)) {
      return ticket;
    }

    return {
      ...ticket,
      status: ticket.status === "CLOSED" ? ticket.status : "ACTIVE",
      messages: [...ticket.messages, message]
    };
  });
}

async function uploadFile(file: File, folder: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  const response = await secureFetch("/api/upload", { method: "POST", body: form });
  return response.url as string;
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <Copy data-icon="inline-start" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function TransferForm({ accounts, settings }: { accounts: Account[]; settings: TransferSettings }) {
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete transfer</CardTitle>
        <CardDescription>Submit the final details. Requests stay under bank review until approved.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const data = await secureFetch("/api/transfers", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(form))
            });
            setMessage(data.message.reviewMessage);
            formElement.reset();
          }}
        >
          <Status message={message} />
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {["Recent", "Saved", "New"].map((item) => (
              <button key={item} type="button" className="rounded-2xl border bg-background/70 px-4 py-3 text-sm font-black transition hover:bg-primary hover:text-primary-foreground">
                {item} recipient
              </button>
            ))}
          </div>
          <FieldGroup>
            <Field>
              <Label htmlFor="fromAccountId">From account</Label>
              <Select id="fromAccountId" name="fromAccountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.type} •••• {account.accountNumber.slice(-4)} · {formatCurrency(Number(account.availableBalance), account.currency)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="type">Transfer type</Label>
                <Select id="type" name="type" required>
                  <option value="INTERNAL">Internal transfer</option>
                  <option value="DOMESTIC">Domestic transfer</option>
                  <option value="INTERNATIONAL">International transfer</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="1" required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="beneficiaryName">Beneficiary name</Label>
                <Input id="beneficiaryName" name="beneficiaryName" required />
              </Field>
              <Field>
                <Label htmlFor="beneficiaryAccount">Beneficiary account</Label>
                <Input id="beneficiaryAccount" name="beneficiaryAccount" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="beneficiaryBank">Beneficiary bank</Label>
                <Input id="beneficiaryBank" name="beneficiaryBank" />
              </Field>
              <Field>
                <Label htmlFor="ibanSwift">IBAN / SWIFT</Label>
                <Input id="ibanSwift" name="ibanSwift" />
              </Field>
            </div>
            <Field>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" name="purpose" required />
            </Field>
          </FieldGroup>
          <div className="rounded-2xl border bg-background/70 p-4 text-sm font-semibold text-muted-foreground">
            {settings.supportInstructions}
          </div>
          <Button size="lg">
            <Send data-icon="inline-start" />
            Submit transfer
          </Button>
          {message ? (
            <Button asChild variant="secondary">
              <a href="/support">{settings.buttonText}</a>
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function RetirementWithdrawalForm({
  accounts,
  feeSettings
}: {
  accounts: RetirementAccount[];
  feeSettings: RetirementFeeSettings;
}) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const selectedAccount = accounts[0];
  const fee = calculateRetirementFee(Number(amount || 0), {
    feePercentage: Number(feeSettings.feePercentage),
    enabled: feeSettings.enabled
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw from 401(k)</CardTitle>
        <CardDescription>Withdrawals are manually reviewed by compliance. No funds move automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const data = await secureFetch("/api/retirement/withdrawals", {
              method: "POST",
              body: JSON.stringify(Object.fromEntries(form))
            });
            setMessage(data.message);
            formElement.reset();
            setAmount("");
          }}
        >
          <Status message={message} />
          <FieldGroup>
            <Field>
              <Label htmlFor="retirementAccountId">401(k) account</Label>
              <Select id="retirementAccountId" name="retirementAccountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    401(k) •••• {account.accountNumber.slice(-4)} · vested {formatCurrency(Number(account.vestedBalance))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="amount">Withdrawal amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="reason">Reason for withdrawal</Label>
              <Textarea id="reason" name="reason" required />
            </Field>
          </FieldGroup>
          <div className="rounded-[1.35rem] border bg-background/70 p-4">
            <p className="text-sm font-black">{feeSettings.feeName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{feeSettings.feeReason}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div><span className="font-bold">Fee</span><br />{Number(feeSettings.feePercentage).toFixed(2)}%</div>
              <div><span className="font-bold">Amount</span><br />{formatCurrency(fee.amount)}</div>
              <div><span className="font-bold">Method</span><br />{feeSettings.paymentMethod.replaceAll("_", " ")}</div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              {feeSettings.enabled
                ? "Crypto deposit is required to unlock eligible 401(k) funds after admin approval."
                : "Compliance fee is currently disabled by the bank."}
            </p>
          </div>
          <Button size="lg" disabled={!selectedAccount || selectedAccount.status === "CLOSED"}>
            Submit 401(k) withdrawal
          </Button>
          <Button asChild variant="secondary">
            <a href="/support">Contact support</a>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function KycForm() {
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Verification</CardTitle>
        <CardDescription>Upload government ID and selfie files for bank review.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const documentFile = form.get("documentFile");
            const selfieFile = form.get("selfieFile");
            if (!(documentFile instanceof File) || !(selfieFile instanceof File)) {
              setMessage("Document and selfie files are required.");
              return;
            }
            const [documentUrl, selfieUrl] = await Promise.all([
              uploadFile(documentFile, "kyc-documents"),
              uploadFile(selfieFile, "kyc-selfies")
            ]);
            await secureFetch("/api/kyc", {
              method: "POST",
              body: JSON.stringify({ documentType: form.get("documentType"), documentUrl, selfieUrl })
            });
            setMessage("Verification submitted for manual review.");
            formElement.reset();
          }}
        >
          <Status message={message} />
          <Field>
            <Label htmlFor="documentType">Document type</Label>
            <Select id="documentType" name="documentType" required>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVER_LICENSE">Driver License</option>
              <option value="NATIONAL_ID">National ID</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="documentFile">Government ID</Label>
            <Input id="documentFile" name="documentFile" type="file" required />
          </Field>
          <Field>
            <Label htmlFor="selfieFile">Selfie</Label>
            <Input id="selfieFile" name="selfieFile" type="file" required />
          </Field>
          <Button>
            <UploadCloud data-icon="inline-start" />
            Submit verification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CardApplicationForm() {
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Card Application</CardTitle>
        <CardDescription>Applications are reviewed by an administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            const file = form.get("governmentIdFile");
            if (!(file instanceof File)) {
              setMessage("Government ID file is required.");
              return;
            }
            const governmentIdUrl = await uploadFile(file, "card-applications");
            await secureFetch("/api/cards", {
              method: "POST",
              body: JSON.stringify({ ...Object.fromEntries(form), governmentIdUrl })
            });
            setMessage("Card application submitted.");
            formElement.reset();
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="type">Card type</Label>
              <Select id="type" name="type" required>
                <option value="CLASSIC">Classic Card</option>
                <option value="GOLD">Gold Card</option>
                <option value="PLATINUM">Platinum Card</option>
                <option value="SIGNATURE">Signature Card</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="annualIncome">Annual income</Label>
              <Input id="annualIncome" name="annualIncome" type="number" min="1" required />
            </Field>
            <Field>
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" name="occupation" required />
            </Field>
            <Field>
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" name="employer" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="governmentIdFile">Government ID</Label>
              <Input id="governmentIdFile" name="governmentIdFile" type="file" required />
            </Field>
          </div>
          <Button>Submit application</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SupportCenter({ initialTickets, userId }: { initialTickets: Ticket[]; userId: string }) {
  const searchParams = useSearchParams();
  const supportRequestMessage = searchParams.get("message") ?? "";
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState(initialTickets[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [draftSubject, setDraftSubject] = useState("Support request");
  const [draftBody, setDraftBody] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [seededSupportRequest, setSeededSupportRequest] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [busy, setBusy] = useState(false);
  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId), [tickets, activeId]);

  useEffect(() => {
    if (!supportRequestMessage || supportRequestMessage === seededSupportRequest) {
      return;
    }

    if (activeTicket) {
      setMessage(supportRequestMessage);
    } else {
      setDraftSubject("Transfer support request");
      setDraftBody(supportRequestMessage);
    }
    setSeededSupportRequest(supportRequestMessage);
  }, [activeTicket, seededSupportRequest, supportRequestMessage]);

  useEffect(() => {
    let socket: Socket | null = null;
    if (activeId) {
      socket = io({ path: "/socket.io" });
      setSocket(socket);
      socket.emit("join_ticket", activeId);
      socket.on("support_message", (incoming: { ticketId: string; message: Ticket["messages"][number] }) => {
        setTickets((current) => appendTicketMessage(current, incoming.ticketId, incoming.message));
      });
    }
    return () => {
      socket?.disconnect();
      setSocket(null);
    };
  }, [activeId]);

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Open cases and live conversations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              className="rounded-md border p-3 text-left transition hover:bg-muted"
              type="button"
              onClick={() => setActiveId(ticket.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-white">{ticket.subject}</p>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.65rem] font-black text-emerald-200">{ticket.status}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {ticket.messages.length} messages{ticket.assignedAdmin ? ` · ${ticket.assignedAdmin.name}` : ""}
              </p>
            </button>
          ))}
          <form
            className="grid gap-3 border-t pt-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              const formElement = event.currentTarget;
              try {
                const attachmentUrl = draftFile ? await uploadFile(draftFile, "support-attachments") : undefined;
                const data = await secureFetch("/api/support/tickets", {
                  method: "POST",
                  body: JSON.stringify({ subject: draftSubject, body: draftBody, attachmentUrl })
                });
                setTickets((current) => [data.ticket, ...current]);
                setActiveId(data.ticket.id);
                setDraftSubject("Support request");
                setDraftBody("");
                setDraftFile(null);
                formElement.reset();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Input
              name="subject"
              placeholder="New ticket subject"
              required
              value={draftSubject}
              onChange={(event) => setDraftSubject(event.target.value)}
            />
            <Textarea
              name="body"
              placeholder="How can support help?"
              required
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
            />
            <Input
              name="attachment"
              type="file"
              onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
            />
            <Button size="sm" disabled={busy}>{busy ? "Opening..." : "Open ticket"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live Chat</CardTitle>
          <CardDescription>{activeTicket ? `${activeTicket.subject} · ${activeTicket.status}` : "Open a ticket to begin."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="min-h-80 max-h-[28rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            {activeTicket?.messages.map((item) => (
              <div key={item.id} className={`mb-3 max-w-[88%] rounded-2xl p-3 text-sm shadow-sm ${item.senderId === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-white/8 text-white"}`}>
                <p className={`mb-1 text-[0.65rem] font-black ${item.senderId === userId ? "text-black/55" : "text-white/40"}`}>
                  {item.senderId === userId ? "You" : item.senderName ?? "GCLB Support"}
                </p>
                <p className="whitespace-pre-wrap break-words">{item.body}</p>
                {item.attachmentUrl ? (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-black underline">
                    View attachment
                  </a>
                ) : null}
              </div>
            ))}
            {!activeTicket?.messages.length ? (
              <p className="py-16 text-center text-sm font-semibold text-muted-foreground">No messages yet.</p>
            ) : null}
          </div>
          {activeTicket ? (
            <form
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!message.trim() && !messageFile) {
                  return;
                }
                setBusy(true);
                const text = message.trim() || "Attachment uploaded";
                try {
                  const attachmentUrl = messageFile ? await uploadFile(messageFile, "support-attachments") : undefined;
                  if (socket?.connected && !attachmentUrl) {
                    await new Promise<void>((resolve, reject) => {
                      socket.emit(
                        "send_support_message",
                        { ticketId: activeTicket.id, body: text },
                        (response: { error?: string; message?: Ticket["messages"][number] }) => {
                          if (response?.error) {
                            reject(new Error(response.error));
                            return;
                          }
                          if (response?.message) {
                            setTickets((current) => appendTicketMessage(current, activeTicket.id, response.message!));
                          }
                          resolve();
                        }
                      );
                    });
                  } else {
                    const data = await secureFetch("/api/support/messages", {
                      method: "POST",
                      body: JSON.stringify({ ticketId: activeTicket.id, body: text, attachmentUrl })
                    });
                    setTickets((current) => appendTicketMessage(current, activeTicket.id, data.message));
                  }
                  setMessage("");
                  setMessageFile(null);
                  event.currentTarget.reset();
                } catch (error) {
                  window.alert(error instanceof Error ? error.message : "Message failed. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message..." />
              <Input className="sm:w-56" type="file" onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)} />
              <Button type="submit" size="icon" aria-label="Send message" disabled={busy}>
                <Send data-icon="inline-start" />
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Record<string, string> }) {
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Management</CardTitle>
        <CardDescription>Update contact information used for account servicing.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await secureFetch("/api/user/profile", { method: "PATCH", body: JSON.stringify(Object.fromEntries(form)) });
            setMessage("Profile updated.");
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={profile.firstName} />
            </Field>
            <Field>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={profile.lastName} />
            </Field>
            <Field>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone} />
            </Field>
            <Field>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={profile.country} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={profile.address} />
            </Field>
          </div>
          <Button>Save profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}
