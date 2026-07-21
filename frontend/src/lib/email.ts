import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

function key() {
  const raw = process.env.SETTINGS_MASTER_KEY;
  if (!raw) {
    return null;
  }
  const buffer = Buffer.from(raw, "base64");
  return buffer.length === 32 ? buffer : null;
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
  const setting = await prisma.emailSetting.findUnique({ where: { id: 1 } });

  return {
    host: setting?.smtpHost ?? process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: setting?.smtpPort ?? Number(process.env.SMTP_PORT ?? 465),
    secure: setting?.smtpSecure ?? process.env.SMTP_SECURE !== "false",
    user: setting?.gmailAddress ?? process.env.SMTP_GMAIL_ADDRESS,
    pass: decryptSecret(setting?.appPasswordEncrypted) ?? process.env.SMTP_GMAIL_APP_PASSWORD,
    senderName: setting?.senderName ?? process.env.SMTP_SENDER_NAME ?? "Grand Central Liberty Bank"
  };
}

export async function sendEmail(input: { to: string | string[]; subject: string; html: string; text?: string }) {
  const config = await getEmailConfig();
  if (!config.user || !config.pass) {
    return {
      skipped: true,
      message: "SMTP credentials are not configured."
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const result = await transporter.sendMail({
    from: `"${config.senderName}" <${config.user}>`,
    to: Array.isArray(input.to) ? input.to.join(",") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  return { skipped: false, messageId: result.messageId };
}
