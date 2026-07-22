export type ConfigIssue = { key: string; severity: "error" | "warning"; message: string };

function isMongo(value?: string) { return Boolean(value && (value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"))); }

export function validateServerConfig(env: NodeJS.ProcessEnv = process.env): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  if (!isMongo(env.PRISMA_DATABASE_URL) && !isMongo(env.DATABASE_URL) && !isMongo(env.MONGO_URL)) {
    issues.push({ key: "DATABASE_URL", severity: "error", message: "Set PRISMA_DATABASE_URL, DATABASE_URL, or MONGO_URL to a MongoDB connection string." });
  }
  for (const key of ["JWT_SECRET", "CSRF_SECRET"] as const) {
    if (!env[key] || env[key]!.length < 32) issues.push({ key, severity: "error", message: `${key} must contain at least 32 characters.` });
  }
  if (!env.SETTINGS_MASTER_KEY) issues.push({ key: "SETTINGS_MASTER_KEY", severity: "warning", message: "Set a base64-encoded 32-byte key before storing SMTP credentials." });
  if (!env.APP_URL || !/^https:\/\//.test(env.APP_URL)) issues.push({ key: "APP_URL", severity: env.NODE_ENV === "production" ? "error" : "warning", message: "Set the canonical HTTPS application URL." });
  if (env.RESEND_API_KEY && !env.EMAIL_FROM) issues.push({ key: "EMAIL_FROM", severity: "error", message: "EMAIL_FROM is required with RESEND_API_KEY." });
  if (!env.RESEND_API_KEY && !(env.SMTP_USER && env.SMTP_PASS) && !(env.SMTP_GMAIL_ADDRESS && env.SMTP_GMAIL_APP_PASSWORD)) {
    issues.push({ key: "EMAIL_PROVIDER", severity: "warning", message: "Transactional email is not configured; set Resend or SMTP variables." });
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) issues.push({ key: "CRON_SECRET", severity: "warning", message: "Email retries require a CRON_SECRET of at least 32 characters." });
  return issues;
}

export function assertCriticalServerConfig(env: NodeJS.ProcessEnv = process.env) {
  const errors = validateServerConfig(env).filter((issue) => issue.severity === "error");
  if (errors.length) throw new Error(`Invalid server configuration: ${errors.map((issue) => `${issue.key}: ${issue.message}`).join(" ")}`);
}
