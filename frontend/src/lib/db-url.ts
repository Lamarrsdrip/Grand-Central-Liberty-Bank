/**
 * Build a Prisma-compatible MongoDB connection string.
 *
 * Priority:
 *  1. DATABASE_URL  — but ONLY when it starts with mongodb:// or mongodb+srv://
 *  2. MONGO_URL + DB_NAME  — the Emergent platform's native secrets
 *
 * If DATABASE_URL exists but uses a different protocol (e.g. postgresql://)
 * we log a clear warning and fall through to MONGO_URL so production never
 * silently uses a Postgres connection string against a MongoDB datasource.
 */
export function buildMongoDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();

  if (explicit) {
    if (explicit.startsWith("mongodb://") || explicit.startsWith("mongodb+srv://")) {
      return explicit;
    }
    // DATABASE_URL is present but not a MongoDB URL — warn loudly and fall back.
    const proto = explicit.split("://")[0] || "(empty)";
    console.error(
      `[db-url] DATABASE_URL uses protocol "${proto}://" — expected "mongodb://" or "mongodb+srv://". ` +
        `Falling back to MONGO_URL. Set DATABASE_URL to a valid MongoDB connection string to suppress this warning.`
    );
  }

  const base = process.env.MONGO_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";
  if (!base) {
    throw new Error(
      explicit
        ? `DATABASE_URL is not a valid MongoDB URL (got "${explicit.split("://")[0]}://..."). ` +
            `Set DATABASE_URL to a mongodb:// or mongodb+srv:// connection string, or set MONGO_URL.`
        : "Neither DATABASE_URL (with mongodb:// protocol) nor MONGO_URL is configured. The application cannot connect to MongoDB."
    );
  }

  const url = new URL(base);
  url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}
