"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { secureFetch } from "@/lib/client-api";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";

function Notice({ message }: { message: string }) {
  return message ? <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold">{message}</p> : null;
}

export function AdminJsonForm({
  title,
  description,
  endpoint,
  method = "PATCH",
  children,
  buttonLabel
}: {
  title?: string;
  description?: string;
  endpoint: string;
  method?: string;
  children: React.ReactNode;
  buttonLabel: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
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
      <Button size="sm">{buttonLabel}</Button>
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
            <input type="hidden" name="enabled" value="true" />
          </div>
        </AdminJsonForm>
      </CardContent>
    </Card>
  );
}

export function TransferSettingsForm({ settings }: { settings: { reviewMessage: string; buttonText: string; supportInstructions: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Message</CardTitle>
        <CardDescription>Change transfer review messaging without code changes.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminJsonForm endpoint="/api/admin/transfer-settings" method="PUT" buttonLabel="Save transfer settings">
          <Field><Label>Review message</Label><Textarea name="reviewMessage" defaultValue={settings.reviewMessage} required /></Field>
          <Field><Label>Button text</Label><Input name="buttonText" defaultValue={settings.buttonText} required /></Field>
          <Field><Label>Support instructions</Label><Textarea name="supportInstructions" defaultValue={settings.supportInstructions} required /></Field>
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
            {SUPPORTED_LOCALES.map((code) => (<input key={code} type="hidden" name="supportedLocales[]" value={code} />))}
            <Field className="sm:col-span-2"><Label>Bank address</Label><Input name="bankAddress" defaultValue={String(settings.bankAddress)} required /></Field>
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
