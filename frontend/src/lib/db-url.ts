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

// Query params that Prisma's MongoDB connector rejects.
// timeoutms / timeoutMS are legacy aliases rejected by the current driver.
const REJECTED_PARAMS = ["timeoutms", "timeout"];

function isMongoDsn(s: string): boolean {
  return s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");
}

// Strip a single query param by name, case-insensitively, using regex on the
// raw string. This is more reliable than URLSearchParams.delete() which is
// case-sensitive and can miss params like timeoutMS when searching for timeoutms.
function stripParam(str: string, name: string): string {
  const re = new RegExp(`([?&])${name}=[^&]*`, "gi");
  const s = str.replace(re, (_, sep) => (sep === "?" ? "?" : ""));
  // Fix up ?& → ? and trailing ? / &
  return s.replace(/\?&/g, "?").replace(/&&+/g, "&").replace(/[?&]$/, "");
}

function cleanMongoUrl(raw: string, dbName: string): string {
  // Strip banned params from the raw string before URL parsing
  let str = raw;
  for (const p of REJECTED_PARAMS) str = stripParam(str, p);

  const url = new URL(str);
  if (dbName) url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  if (!url.searchParams.has("serverSelectionTimeoutMS")) url.searchParams.set("serverSelectionTimeoutMS", "5000");
  if (!url.searchParams.has("connectTimeoutMS")) url.searchParams.set("connectTimeoutMS", "10000");
  return url.toString();
}

export function buildMongoDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";

  let clean: string;

  if (explicit && isMongoDsn(explicit)) {
    clean = cleanMongoUrl(explicit, dbName);
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
