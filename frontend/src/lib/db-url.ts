/**
 * Build a Prisma-compatible MongoDB connection string.
 *
 * Priority:
 *  1. DATABASE_URL — but ONLY when it starts with mongodb:// or mongodb+srv://
 *  2. MONGO_URL + DB_NAME — the Emergent platform's native secrets
 *
 * Side-effect: patches process.env.DATABASE_URL to the resolved MongoDB URL so
 * every downstream consumer (Prisma CLI subprocesses, edge imports that create
 * PrismaClient directly) sees a valid connection string without needing to call
 * this function themselves.
 */

// Query parameters that Prisma's MongoDB connector rejects at startup.
// "timeoutms" is a legacy MongoClient alias that the current driver no longer
// accepts in the connection string. Strip it so MONGO_URL can be used as-is.
const PRISMA_MONGO_REJECTED_PARAMS = ["timeoutms", "timeout"];

function isMongoDsn(s: string): boolean {
  return s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");
}

function cleanMongoUrl(raw: string, dbName: string): string {
  const url = new URL(raw);
  for (const p of PRISMA_MONGO_REJECTED_PARAMS) url.searchParams.delete(p);
  if (dbName) url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}

export function buildMongoDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";

  // Fast path: DATABASE_URL is already a valid MongoDB URL.
  if (explicit && isMongoDsn(explicit)) {
    const clean = cleanMongoUrl(explicit, dbName);
    // Patch env so CLI subprocesses that inherit process.env also get the clean URL.
    if (clean !== explicit) {
      process.env.DATABASE_URL = clean;
      console.log("[db-url] Removed invalid params from DATABASE_URL (e.g. timeoutms).");
    }
    return clean;
  }

  // DATABASE_URL is missing or wrong protocol — fall back to MONGO_URL.
  if (explicit) {
    const proto = explicit.split("://")[0] || "(empty)";
    console.error(
      `[db-url] DATABASE_URL uses protocol "${proto}://" — expected "mongodb://" or "mongodb+srv://". ` +
        `Overwriting process.env.DATABASE_URL with MONGO_URL for this runtime session.`
    );
  }

  const base = process.env.MONGO_URL?.trim();
  if (!base) {
    throw new Error(
      explicit
        ? `DATABASE_URL is not a valid MongoDB URL (got "${explicit.split("://")[0]}://..."). ` +
            `Set DATABASE_URL to a mongodb:// or mongodb+srv:// connection string, or set MONGO_URL.`
        : "Neither DATABASE_URL (with mongodb:// protocol) nor MONGO_URL is configured. The application cannot connect to MongoDB."
    );
  }

  const clean = cleanMongoUrl(base, dbName);
  // Overwrite the bad/missing DATABASE_URL so ALL code that reads process.env.DATABASE_URL
  // (directly or via Prisma's env-resolution) gets a valid MongoDB connection string.
  process.env.DATABASE_URL = clean;
  console.log("[db-url] DATABASE_URL patched from MONGO_URL for this session.");
  return clean;
}
