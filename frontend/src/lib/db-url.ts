/**
 * Build a Prisma-compatible MongoDB connection string and write it to
 * process.env.PRISMA_DATABASE_URL — the env var that schema.prisma reads.
 *
 * We deliberately use PRISMA_DATABASE_URL (not DATABASE_URL) because the
 * Emergent platform injects DATABASE_URL=postgresql://... which Prisma's
 * generated client captures at module-load time before any runtime code runs.
 * By reading a separate var, Emergent's value never reaches Prisma.
 *
 * Priority:
 *  1. DATABASE_URL — honoured when it's already a valid MongoDB URL
 *  2. MONGO_URL + DB_NAME — the Emergent platform's native MongoDB secrets
 */

const REJECTED_PARAMS = ["timeoutms", "timeout"];

function isMongoDsn(s: string): boolean {
  return s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");
}

function cleanMongoUrl(raw: string, dbName: string): string {
  const url = new URL(raw);
  // Case-insensitive delete — Emergent's MONGO_URL uses timeoutMS (camelCase)
  for (const key of Array.from(url.searchParams.keys())) {
    if (REJECTED_PARAMS.includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  if (dbName) url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}

export function buildMongoDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";

  let clean: string;

  if (explicit && isMongoDsn(explicit)) {
    clean = cleanMongoUrl(explicit, dbName);
    if (clean !== explicit) {
      console.log("[db-url] Removed invalid params from DATABASE_URL (e.g. timeoutms).");
    }
  } else {
    if (explicit) {
      const proto = explicit.split("://")[0] || "(empty)";
      console.error(
        `[db-url] DATABASE_URL uses protocol "${proto}://" — ignoring. ` +
          `Prisma now reads PRISMA_DATABASE_URL (built from MONGO_URL).`
      );
    }

    const base = process.env.MONGO_URL?.trim();
    if (!base) {
      throw new Error(
        explicit
          ? `DATABASE_URL is not a valid MongoDB URL (got "${explicit.split("://")[0]}://..."). ` +
              `Set DATABASE_URL to a mongodb:// or mongodb+srv:// connection string, or set MONGO_URL.`
          : "Neither DATABASE_URL (with mongodb:// protocol) nor MONGO_URL is configured."
      );
    }

    clean = cleanMongoUrl(base, dbName);
    console.log("[db-url] MongoDB URL built from MONGO_URL → PRISMA_DATABASE_URL.");
  }

  // Write to the var that schema.prisma's datasource reads.
  process.env.PRISMA_DATABASE_URL = clean;
  return clean;
}
