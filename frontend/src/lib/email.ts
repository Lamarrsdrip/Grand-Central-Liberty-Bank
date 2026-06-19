import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

function key() {
  const raw = process.env.SETTINGS_MASTER_KEY;
  if (raw) {
    const buffer = Buffer.from(raw, "base64");
    if (buffer.length === 32) return buffer;
  }
  // Derive a stable 32-byte key from JWT_SECRET when SETTINGS_MASTER_KEY is absent.
  // This lets email settings be saved without requiring an extra env var.
  const seed = process.env.JWT_SECRET ?? "grand-central-liberty-bank-default-key";
  return crypto.createHash("sha256").update(seed).digest();
}

export function encryptSecret(secret: string) {
  const secretKey = key();
  if (!secretKey) {
    throw new Error("SETTINGS_MASTER_KEY must be a base64-encoded 32-byte key.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value?: string | null) {
  if (!value) {
    return null;
  }
  const secretKey = key();
  if (!secretKey) {
    throw new Error("SETTINGS_MASTER_KEY must be a base64-encoded 32-byte key.");
  }
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export async function getEmailConfig() {
  let setting: { smtpHost: string; smtpPort: number; smtpSecure: boolean; gmailAddress: string | null; appPasswordEncrypted: string | null; senderName: string } | null = null;
  try {
    setting = await prisma.emailSetting.findUnique({ where: { id: 1 } });
  } catch {
    // DB might not be ready; fall through to env vars
  }

  let decryptedPass: string | null = null;
  try {
    decryptedPass = decryptSecret(setting?.appPasswordEncrypted);
  } catch {
    // Key mismatch or missing — fall back to env var
  }

  return {
    host: setting?.smtpHost ?? process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: setting?.smtpPort ?? Number(process.env.SMTP_PORT ?? 465),
    secure: setting?.smtpSecure ?? process.env.SMTP_SECURE !== "false",
    user: setting?.gmailAddress ?? process.env.SMTP_GMAIL_ADDRESS ?? process.env.SMTP_USER,
    pass: decryptedPass ?? process.env.SMTP_GMAIL_APP_PASSWORD ?? process.env.SMTP_PASS,
    senderName: setting?.senderName ?? process.env.SMTP_SENDER_NAME ?? "Grand Central Liberty Bank"
  };
}

export async function sendEmail(input: { to: string | string[]; subject: string; html: string; text?: string }) {
  const config = await getEmailConfig();
  if (!config.user || !config.pass) {
    console.warn("[email] SMTP credentials not configured — skipping email to", input.to);
    return {
      skipped: true,
      message: "SMTP credentials are not configured."
    };
  }

  const isGmail = config.host.includes("gmail");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transportOptions: any = isGmail
    ? {
        service: "gmail",
        auth: { user: config.user, pass: config.pass },
        tls: { rejectUnauthorized: false }
      }
    : {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        tls: { rejectUnauthorized: false }
      };

  const transporter = nodemailer.createTransport(transportOptions);

  try {
    const result = await transporter.sendMail({
      from: `"${config.senderName}" <${config.user}>`,
      to: Array.isArray(input.to) ? input.to.join(",") : input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });
    console.log("[email] sent", result.messageId, "to", input.to);
    return { skipped: false, messageId: result.messageId };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed:", msg);
    throw new Error(`Email delivery failed: ${msg}`);
  }
}
