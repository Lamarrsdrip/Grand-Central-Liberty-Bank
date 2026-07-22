import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";

export const EMAIL_EVENTS = [
  "LOGIN_SUCCESS", "LOGIN_NEW_DEVICE", "LOGIN_SECURITY_WARNING", "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED", "EMAIL_CHANGED", "PROFILE_CHANGED",
  "TWO_FACTOR_ENABLED", "TWO_FACTOR_DISABLED", "ACCOUNT_LOCKED", "ACCOUNT_SUSPENDED",
  "ACCOUNT_ACTIVATED", "ACCOUNT_RESTORED", "BANK_TRANSFER_CREATED", "BANK_TRANSFER_PENDING",
  "BANK_TRANSFER_APPROVED", "BANK_TRANSFER_COMPLETED", "BANK_TRANSFER_DECLINED",
  "BANK_TRANSFER_FAILED", "BANK_TRANSFER_CANCELLED", "INCOMING_DEPOSIT_RECEIVED",
  "DEPOSIT_PENDING", "DEPOSIT_APPROVED", "DEPOSIT_DECLINED", "CRYPTO_DEPOSIT_DETECTED",
  "CRYPTO_DEPOSIT_CONFIRMED", "CRYPTO_WITHDRAWAL_REQUESTED", "CRYPTO_WITHDRAWAL_PENDING",
  "CRYPTO_WITHDRAWAL_APPROVED", "CRYPTO_WITHDRAWAL_COMPLETED", "CRYPTO_WITHDRAWAL_REJECTED",
  "CRYPTO_WITHDRAWAL_FAILED", "INTERNAL_ACCOUNT_TRANSFER", "BENEFICIARY_ADDED",
  "BENEFICIARY_REMOVED", "CARD_TRANSACTION", "CARD_FROZEN", "CARD_UNFROZEN",
  "CARD_REQUESTED", "CARD_STATUS_CHANGED", "RETIREMENT_ACTION", "RETIREMENT_BALANCE_EVENT",
  "ADMIN_BALANCE_ADJUSTMENT", "FEE_CHARGED", "REFUND_OR_REVERSAL", "SUPPORT_ADMIN_REPLY",
  "SUPPORT_CUSTOMER_MESSAGE", "SUPPORT_TICKET_CREATED", "SUPPORT_TICKET_STATUS",
  "KYC_SUBMITTED", "KYC_APPROVED", "KYC_REJECTED", "KYC_INFO_REQUESTED",
  "ACCOUNT_VERIFICATION_COMPLETED", "ACCOUNT_STATUS_CHANGED", "COMPLIANCE_ACTION",
  "EMAIL_VERIFICATION_REQUESTED"
] as const;

export type EmailEvent = (typeof EMAIL_EVENTS)[number];

export function loginEmailEvent(knownDevice: boolean): EmailEvent {
  return knownDevice ? "LOGIN_SUCCESS" : "LOGIN_NEW_DEVICE";
}

export function transferStatusEmailEvent(status: string): EmailEvent {
  switch (status) {
    case "APPROVED": return "BANK_TRANSFER_APPROVED";
    case "REJECTED": return "BANK_TRANSFER_DECLINED";
    case "CANCELLED": return "BANK_TRANSFER_CANCELLED";
    case "FAILED": return "BANK_TRANSFER_FAILED";
    case "COMPLETED": return "BANK_TRANSFER_COMPLETED";
    default: return "BANK_TRANSFER_PENDING";
  }
}

export type TransactionalEmailData = {
  customerName: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  transactionType?: string;
  transactionReference?: string;
  maskedAccount?: string;
  timestamp?: Date | string;
  nextStep?: string;
  supportUrl?: string;
  actionUrl?: string;
  messagePreview?: string;
  explanation?: string;
  device?: string;
  ipRegion?: string;
};

type TransactionalEmailInput = {
  event: EmailEvent;
  to: string;
  idempotencyKey: string;
  relatedUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  data: TransactionalEmailData;
};

const TITLES: Record<EmailEvent, string> = {
  LOGIN_SUCCESS: "Successful sign-in", LOGIN_NEW_DEVICE: "New device sign-in", LOGIN_SECURITY_WARNING: "Security warning",
  PASSWORD_CHANGED: "Password changed", PASSWORD_RESET_REQUESTED: "Password reset requested", PASSWORD_RESET_COMPLETED: "Password reset completed",
  EMAIL_CHANGED: "Email address changed", PROFILE_CHANGED: "Profile updated", TWO_FACTOR_ENABLED: "Two-factor authentication enabled",
  TWO_FACTOR_DISABLED: "Two-factor authentication disabled", ACCOUNT_LOCKED: "Account locked", ACCOUNT_SUSPENDED: "Account suspended",
  ACCOUNT_ACTIVATED: "Account activated", ACCOUNT_RESTORED: "Account restored", BANK_TRANSFER_CREATED: "Transfer created",
  BANK_TRANSFER_PENDING: "Transfer pending", BANK_TRANSFER_APPROVED: "Transfer approved", BANK_TRANSFER_COMPLETED: "Transfer completed",
  BANK_TRANSFER_DECLINED: "Transfer declined", BANK_TRANSFER_FAILED: "Transfer failed", BANK_TRANSFER_CANCELLED: "Transfer cancelled",
  INCOMING_DEPOSIT_RECEIVED: "Deposit received", DEPOSIT_PENDING: "Deposit pending", DEPOSIT_APPROVED: "Deposit approved",
  DEPOSIT_DECLINED: "Deposit declined", CRYPTO_DEPOSIT_DETECTED: "Crypto deposit detected", CRYPTO_DEPOSIT_CONFIRMED: "Crypto deposit confirmed",
  CRYPTO_WITHDRAWAL_REQUESTED: "Crypto withdrawal requested", CRYPTO_WITHDRAWAL_PENDING: "Crypto withdrawal pending",
  CRYPTO_WITHDRAWAL_APPROVED: "Crypto withdrawal approved", CRYPTO_WITHDRAWAL_COMPLETED: "Crypto withdrawal completed",
  CRYPTO_WITHDRAWAL_REJECTED: "Crypto withdrawal rejected", CRYPTO_WITHDRAWAL_FAILED: "Crypto withdrawal failed",
  INTERNAL_ACCOUNT_TRANSFER: "Internal transfer completed", BENEFICIARY_ADDED: "Beneficiary added", BENEFICIARY_REMOVED: "Beneficiary removed",
  CARD_TRANSACTION: "Card transaction", CARD_FROZEN: "Card frozen", CARD_UNFROZEN: "Card unfrozen", CARD_REQUESTED: "Card requested",
  CARD_STATUS_CHANGED: "Card status updated", RETIREMENT_ACTION: "401(k) account activity", RETIREMENT_BALANCE_EVENT: "401(k) balance update",
  ADMIN_BALANCE_ADJUSTMENT: "Account balance adjusted", FEE_CHARGED: "Fee charged", REFUND_OR_REVERSAL: "Refund or reversal",
  SUPPORT_ADMIN_REPLY: "New support reply", SUPPORT_CUSTOMER_MESSAGE: "New customer support message", SUPPORT_TICKET_CREATED: "Support ticket created",
  SUPPORT_TICKET_STATUS: "Support ticket updated", KYC_SUBMITTED: "Identity verification submitted", KYC_APPROVED: "Identity verification approved",
  KYC_REJECTED: "Identity verification needs attention", KYC_INFO_REQUESTED: "More verification information requested",
  ACCOUNT_VERIFICATION_COMPLETED: "Account verification completed", ACCOUNT_STATUS_CHANGED: "Account status changed",
  COMPLIANCE_ACTION: "Important account review", EMAIL_VERIFICATION_REQUESTED: "Verify your email address"
};

export function escapeEmailHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] ?? character);
}

export function maskSensitiveEmailText(value: unknown) {
  return String(value ?? "").replace(/\b(?:\d[ -]*?){13,19}\b/g, (candidate) => {
    const digits = candidate.replace(/\D/g, "");
    return `•••• ${digits.slice(-4)}`;
  });
}

export function renderTransactionalEmail(event: EmailEvent, data: TransactionalEmailData) {
  const title = TITLES[event];
  const timestamp = new Date(data.timestamp ?? Date.now()).toISOString();
  const detailRows: Array<[string, string | number | undefined]> = [
    ["Transaction type", data.transactionType],
    ["Amount", data.amount === undefined ? undefined : `${data.currency ?? ""} ${data.amount}`.trim()],
    ["Status", data.status], ["Account", data.maskedAccount], ["Reference", data.transactionReference],
    ["Time", timestamp], ["Device", data.device], ["Approximate location", data.ipRegion]
  ];
  const details = detailRows.filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "");
  const explanation = data.explanation ?? `This message confirms: ${title.toLowerCase()}.`;
  const nextStep = data.nextStep ?? "No action is required. Contact support if you do not recognize this activity.";
  const supportUrl = data.supportUrl ?? `${process.env.APP_URL ?? ""}/support`;

  const safe = (value: unknown) => maskSensitiveEmailText(value);
  const rows = details.map(([label, value]) => `<tr><td style="padding:6px 12px;color:#667085">${escapeEmailHtml(label)}</td><td style="padding:6px 12px;font-weight:700">${escapeEmailHtml(safe(value))}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#101828"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#08120d;color:#fff;border-radius:18px;padding:28px"><p style="margin:0;color:#62d891;font-weight:700">GRAND CENTRAL LIBERTY BANK</p><h1 style="margin:12px 0 20px;font-size:26px">${escapeEmailHtml(title)}</h1><p>Hello ${escapeEmailHtml(safe(data.customerName))},</p><p>${escapeEmailHtml(safe(explanation))}</p>${data.messagePreview ? `<blockquote style="margin:18px 0;padding:12px;border-left:3px solid #22c55e;background:#101d16">${escapeEmailHtml(safe(data.messagePreview))}</blockquote>` : ""}${rows ? `<table style="width:100%;background:#fff;color:#101828;border-radius:12px;padding:8px">${rows}</table>` : ""}<p style="margin-top:20px">${escapeEmailHtml(safe(nextStep))}</p>${data.actionUrl ? `<p><a href="${escapeEmailHtml(data.actionUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#22c55e;color:#051009;text-decoration:none;font-weight:700">Continue securely</a></p>` : ""}<p style="font-size:13px;color:#98a2b3">Support: <a style="color:#62d891" href="${escapeEmailHtml(supportUrl)}">${escapeEmailHtml(supportUrl)}</a></p></div></div></body></html>`;
  const text = [`Grand Central Liberty Bank — ${title}`, `Hello ${safe(data.customerName)},`, safe(explanation), ...details.map(([label, value]) => `${label}: ${safe(value)}`), data.messagePreview ? `Message: ${safe(data.messagePreview)}` : "", safe(nextStep), `Support: ${supportUrl}`].filter(Boolean).join("\n\n");
  return { subject: `${title} | Grand Central Liberty Bank`, html, text };
}

async function deliver(id: string) {
  const claim = await prisma.emailDelivery.updateMany({
    where: { id, status: { in: ["PENDING", "FAILED"] }, attemptCount: { lt: 5 } },
    data: { status: "PROCESSING", attemptCount: { increment: 1 }, lastError: null }
  });
  if (claim.count !== 1) return prisma.emailDelivery.findUnique({ where: { id } });

  const delivery = await prisma.emailDelivery.findUniqueOrThrow({ where: { id } });
  try {
    const result = await sendEmail({ to: delivery.recipient, subject: delivery.subject, html: delivery.htmlBody, text: delivery.textBody });
    if (result.skipped || !result.messageId) throw new Error(result.message ?? "Email provider is not configured.");
    const sent = await prisma.emailDelivery.update({ where: { id }, data: { status: "SENT", provider: result.provider, providerMessageId: result.messageId, sentAt: new Date(), nextAttemptAt: null } });
    log.info("email.delivery.sent", { deliveryId: id, eventType: delivery.eventType, provider: result.provider });
    return sent;
  } catch (error) {
    const reason = (error instanceof Error ? error.message : "Email delivery failed.").slice(0, 500);
    const delayMinutes = Math.min(60, 2 ** delivery.attemptCount);
    const failed = await prisma.emailDelivery.update({ where: { id }, data: { status: "FAILED", lastError: reason, nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000) } });
    log.error("email.delivery.failed", { deliveryId: id, eventType: delivery.eventType, attemptCount: failed.attemptCount, reason });
    return failed;
  }
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const rendered = renderTransactionalEmail(input.event, input.data);
  const delivery = await prisma.emailDelivery.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      eventType: input.event,
      idempotencyKey: input.idempotencyKey,
      recipient: input.to.trim().toLowerCase(),
      relatedUserId: input.relatedUserId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      subject: rendered.subject,
      htmlBody: rendered.html,
      textBody: rendered.text
    },
    update: {}
  });
  if (delivery.status === "SENT") return delivery;
  return deliver(delivery.id);
}

export async function processEmailOutbox(limit = 25) {
  // A terminated serverless invocation can leave a claimed delivery in PROCESSING.
  // Requeue only stale claims; active workers retain their claim and the atomic
  // status transition below still prevents two providers sends for one event.
  await prisma.emailDelivery.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: "FAILED", lastError: "Previous delivery attempt was interrupted; safely queued for retry.", nextAttemptAt: new Date() }
  });
  const deliveries = await prisma.emailDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attemptCount: { lt: 5 },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { isSet: false } }, { nextAttemptAt: { lte: new Date() } }]
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100)
  });
  return Promise.all(deliveries.map((delivery) => deliver(delivery.id)));
}
