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
import { useTranslations } from "@/lib/i18n/use-translations";
import { getTranslations } from "@/lib/i18n/translations";
import { isSupportedLocale } from "@/lib/locales";
import { formatInCurrency } from "@/lib/currency";
import { useCurrency } from "@/lib/currency-context";

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
  const { tx } = useTranslations();
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
      {copied ? tx.wallet_copied : "Copy"}
    </Button>
  );
}

export function TransferForm({ accounts, settings }: { accounts: Account[]; settings: TransferSettings }) {
  const { tx } = useTranslations();
  const [message, setMessage] = useState("");
  const displayCurrency = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx.transfer_form_title}</CardTitle>
        <CardDescription>{tx.transfer_form_desc}</CardDescription>
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
            {[tx.transfer_recent_label, tx.transfer_saved_label, tx.transfer_or_new].map((item) => (
              <button key={item} type="button" className="rounded-2xl border bg-background/70 px-4 py-3 text-sm font-black transition hover:bg-primary hover:text-primary-foreground">
                {item}
              </button>
            ))}
          </div>
          <FieldGroup>
            <Field>
              <Label htmlFor="fromAccountId">{tx.transfer_label_from}</Label>
              <Select id="fromAccountId" name="fromAccountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.type} •••• {account.accountNumber.slice(-4)} · {formatInCurrency(Number(account.availableBalance), displayCurrency)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="type">{tx.transfer_type_label}</Label>
                <Select id="type" name="type" required>
                  <option value="INTERNAL">{tx.transfer_internal_option}</option>
                  <option value="DOMESTIC">{tx.transfer_domestic_option}</option>
                  <option value="INTERNATIONAL">{tx.transfer_international_option}</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="amount">{tx.transfer_amount}</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="1" required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="beneficiaryName">{tx.transfer_beneficiary_name}</Label>
                <Input id="beneficiaryName" name="beneficiaryName" required />
              </Field>
              <Field>
                <Label htmlFor="beneficiaryAccount">{tx.transfer_beneficiary_account}</Label>
                <Input id="beneficiaryAccount" name="beneficiaryAccount" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="beneficiaryBank">{tx.transfer_beneficiary_bank}</Label>
                <Input id="beneficiaryBank" name="beneficiaryBank" />
              </Field>
              <Field>
                <Label htmlFor="ibanSwift">{tx.transfer_iban_swift}</Label>
                <Input id="ibanSwift" name="ibanSwift" />
              </Field>
            </div>
            <Field>
              <Label htmlFor="purpose">{tx.transfer_label_purpose}</Label>
              <Textarea id="purpose" name="purpose" required />
            </Field>
          </FieldGroup>
          <div className="rounded-2xl border bg-background/70 p-4 text-sm font-semibold text-muted-foreground">
            {settings.supportInstructions}
          </div>
          <Button size="lg">
            <Send data-icon="inline-start" />
            {tx.transfer_submit_btn}
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
  const { tx } = useTranslations();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const displayCurrency = useCurrency();
  const selectedAccount = accounts[0];
  const fee = calculateRetirementFee(Number(amount || 0), {
    feePercentage: Number(feeSettings.feePercentage),
    enabled: feeSettings.enabled
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx.retire_title}</CardTitle>
        <CardDescription>{tx.retire_desc}</CardDescription>
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
              <Label htmlFor="retirementAccountId">{tx.retire_account_label}</Label>
              <Select id="retirementAccountId" name="retirementAccountId" required>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    401(k) •••• {account.accountNumber.slice(-4)} · vested {formatInCurrency(Number(account.vestedBalance), displayCurrency)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="amount">{tx.retire_amount_label}</Label>
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
              <Label htmlFor="reason">{tx.retire_reason}</Label>
              <Textarea id="reason" name="reason" required />
            </Field>
          </FieldGroup>
          <div className="rounded-[1.35rem] border bg-background/70 p-4">
            <p className="text-sm font-black">{feeSettings.feeName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{feeSettings.feeReason}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div><span className="font-bold">{tx.retire_fee_col}</span><br />{Number(feeSettings.feePercentage).toFixed(2)}%</div>
              <div><span className="font-bold">{tx.retire_amount_col}</span><br />{formatInCurrency(fee.amount, displayCurrency)}</div>
              <div><span className="font-bold">{tx.retire_method_col}</span><br />{feeSettings.paymentMethod.replaceAll("_", " ")}</div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              {feeSettings.enabled ? tx.retire_fee_enabled : tx.retire_fee_disabled}
            </p>
          </div>
          <Button size="lg" disabled={!selectedAccount || selectedAccount.status === "CLOSED"}>
            {tx.retire_submit}
          </Button>
          <Button asChild variant="secondary">
            <a href="/support">{tx.retire_contact_support}</a>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function KycForm() {
  const { tx } = useTranslations();
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx.kyc_title}</CardTitle>
        <CardDescription>{tx.kyc_desc}</CardDescription>
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
              setMessage(tx.kyc_files_required);
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
            setMessage(tx.kyc_submitted);
            formElement.reset();
          }}
        >
          <Status message={message} />
          <Field>
            <Label htmlFor="documentType">{tx.kyc_doc_type}</Label>
            <Select id="documentType" name="documentType" required>
              <option value="PASSPORT">{tx.kyc_passport}</option>
              <option value="DRIVER_LICENSE">{tx.kyc_driver}</option>
              <option value="NATIONAL_ID">{tx.kyc_national}</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="documentFile">{tx.kyc_gov_id}</Label>
            <Input id="documentFile" name="documentFile" type="file" required />
          </Field>
          <Field>
            <Label htmlFor="selfieFile">{tx.kyc_selfie}</Label>
            <Input id="selfieFile" name="selfieFile" type="file" required />
          </Field>
          <Button>
            <UploadCloud data-icon="inline-start" />
            {tx.kyc_submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CardApplicationForm() {
  const { tx } = useTranslations();
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx.card_app_title}</CardTitle>
        <CardDescription>{tx.card_app_desc}</CardDescription>
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
              setMessage(tx.card_gov_id_required);
              return;
            }
            const governmentIdUrl = await uploadFile(file, "card-applications");
            await secureFetch("/api/cards", {
              method: "POST",
              body: JSON.stringify({ ...Object.fromEntries(form), governmentIdUrl })
            });
            setMessage(tx.card_app_submitted);
            formElement.reset();
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="type">{tx.card_type}</Label>
              <Select id="type" name="type" required>
                <option value="CLASSIC">{tx.card_classic}</option>
                <option value="GOLD">{tx.card_gold}</option>
                <option value="PLATINUM">{tx.card_platinum}</option>
                <option value="SIGNATURE">{tx.card_signature}</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="annualIncome">{tx.card_annual_income}</Label>
              <Input id="annualIncome" name="annualIncome" type="number" min="1" required />
            </Field>
            <Field>
              <Label htmlFor="occupation">{tx.card_occupation}</Label>
              <Input id="occupation" name="occupation" required />
            </Field>
            <Field>
              <Label htmlFor="employer">{tx.card_employer}</Label>
              <Input id="employer" name="employer" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">{tx.profile_address_label}</Label>
              <Input id="address" name="address" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="governmentIdFile">{tx.kyc_gov_id}</Label>
              <Input id="governmentIdFile" name="governmentIdFile" type="file" required />
            </Field>
          </div>
          <Button>{tx.card_app_submit}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SupportCenter({
  initialTickets,
  userId,
  locale = "en"
}: {
  initialTickets: Ticket[];
  userId: string;
  locale?: string;
}) {
  const { tx } = useTranslations();
  const searchParams = useSearchParams();
  const supportRequestMessage = searchParams.get("message") ?? "";
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState(initialTickets[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [seededSupportRequest, setSeededSupportRequest] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [busy, setBusy] = useState(false);
  const activeTicket = useMemo(() => tickets.find((ticket) => ticket.id === activeId), [tickets, activeId]);

  const safe = isSupportedLocale(locale) ? locale : "en";
  const localTx = getTranslations(safe);
  const defaultSubject = localTx.support_tickets_title ?? "Support request";

  useEffect(() => {
    setDraftSubject(defaultSubject);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (!supportRequestMessage || supportRequestMessage === seededSupportRequest) {
      return;
    }

    if (activeTicket) {
      setMessage(supportRequestMessage);
    } else {
      setDraftSubject(localTx.transfer_form_title ?? "Transfer support request");
      setDraftBody(supportRequestMessage);
    }
    setSeededSupportRequest(supportRequestMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <CardTitle>{tx.support_tickets_title}</CardTitle>
          <CardDescription>{tx.support_tickets_desc}</CardDescription>
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
                setDraftSubject(defaultSubject);
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
              placeholder={tx.support_new_subject}
              required
              value={draftSubject}
              onChange={(event) => setDraftSubject(event.target.value)}
            />
            <Textarea
              name="body"
              placeholder={tx.support_help_placeholder}
              required
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
            />
            <Input
              name="attachment"
              type="file"
              onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
            />
            <Button size="sm" disabled={busy}>{busy ? tx.support_opening : tx.support_open_ticket}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{tx.support_live_chat_title}</CardTitle>
          <CardDescription>{activeTicket ? `${activeTicket.subject} · ${activeTicket.status}` : tx.support_start_conv}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="min-h-80 max-h-[28rem] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            {activeTicket?.messages.map((item) => (
              <div key={item.id} className={`mb-3 max-w-[88%] rounded-2xl p-3 text-sm shadow-sm ${item.senderId === userId ? "ml-auto bg-primary text-primary-foreground" : "bg-white/8 text-white"}`}>
                <p className={`mb-1 text-[0.65rem] font-black ${item.senderId === userId ? "text-black/55" : "text-white/40"}`}>
                  {item.senderId === userId ? tx.support_you : item.senderName ?? tx.support_gclb}
                </p>
                <p className="whitespace-pre-wrap break-words">{item.body}</p>
                {item.attachmentUrl ? (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-black underline">
                    {tx.support_view_attachment}
                  </a>
                ) : null}
              </div>
            ))}
            {!activeTicket?.messages.length && activeTicket ? (
              <p className="py-16 text-center text-sm font-semibold text-muted-foreground">{tx.support_no_messages}</p>
            ) : !activeTicket ? (
              <p className="py-16 text-center text-sm font-semibold text-muted-foreground">{tx.support_chat_empty}</p>
            ) : null}
          </div>
          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!message.trim() && !messageFile) return;
              setBusy(true);
              const text = message.trim() || "Attachment uploaded";
              try {
                let ticketId = activeTicket?.id;
                if (!ticketId) {
                  const subject = text.length > 60 ? text.slice(0, 57) + "..." : text;
                  const data = await secureFetch("/api/support/tickets", {
                    method: "POST",
                    body: JSON.stringify({ subject, body: text })
                  });
                  setTickets((current) => [data.ticket, ...current]);
                  setActiveId(data.ticket.id);
                  ticketId = data.ticket.id;
                  setMessage("");
                  setMessageFile(null);
                  event.currentTarget.reset();
                  return;
                }
                const attachmentUrl = messageFile ? await uploadFile(messageFile, "support-attachments") : undefined;
                if (socket?.connected && !attachmentUrl) {
                  await new Promise<void>((resolve, reject) => {
                    socket!.emit(
                      "send_support_message",
                      { ticketId, body: text },
                      (response: { error?: string; message?: Ticket["messages"][number] }) => {
                        if (response?.error) { reject(new Error(response.error)); return; }
                        if (response?.message) {
                          setTickets((current) => appendTicketMessage(current, ticketId!, response.message!));
                        }
                        resolve();
                      }
                    );
                  });
                } else {
                  const data = await secureFetch("/api/support/messages", {
                    method: "POST",
                    body: JSON.stringify({ ticketId, body: text, attachmentUrl })
                  });
                  setTickets((current) => appendTicketMessage(current, ticketId!, data.message));
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
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={activeTicket ? tx.support_type_message : tx.support_start_conv} />
            <Input className="sm:w-56" type="file" onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)} />
            <Button type="submit" size="icon" aria-label="Send message" disabled={busy}>
              <Send data-icon="inline-start" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Record<string, string> }) {
  const { tx } = useTranslations();
  const [message, setMessage] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx.profile_form_title}</CardTitle>
        <CardDescription>{tx.profile_form_desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await secureFetch("/api/user/profile", { method: "PATCH", body: JSON.stringify(Object.fromEntries(form)) });
            setMessage(tx.profile_updated);
          }}
        >
          <Status message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="firstName">{tx.profile_first_name}</Label>
              <Input id="firstName" name="firstName" defaultValue={profile.firstName} />
            </Field>
            <Field>
              <Label htmlFor="lastName">{tx.profile_last_name}</Label>
              <Input id="lastName" name="lastName" defaultValue={profile.lastName} />
            </Field>
            <Field>
              <Label htmlFor="phone">{tx.profile_phone_label}</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone} />
            </Field>
            <Field>
              <Label htmlFor="country">{tx.profile_country_label}</Label>
              <Input id="country" name="country" defaultValue={profile.country} />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="address">{tx.profile_address_label}</Label>
              <Input id="address" name="address" defaultValue={profile.address} />
            </Field>
          </div>
          <Button>{tx.profile_save_profile}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
