/**
 * Next.js instrumentation hook — runs once when the server process initialises,
 * before any route module is imported or evaluated.
 *
 * We use this to write PRISMA_DATABASE_URL (which schema.prisma reads) from
 * MONGO_URL before the Prisma generated client is loaded, so the correct
 * MongoDB URL is captured at module-evaluation time.
 *
 * This is the earliest possible hook in the Next.js lifecycle.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const REJECTED = ["timeoutms", "timeout"];
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";
  const isMongo = (s: string) =>
    s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");

  function buildClean(raw: string): string {
    const url = new URL(raw);
    // Case-insensitive delete — Emergent's MONGO_URL uses timeoutMS (camelCase)
    for (const key of Array.from(url.searchParams.keys())) {
      if (REJECTED.includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (dbName) url.pathname = `/${dbName}`;
    if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
    if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
    return url.toString();
  }

  try {
    const explicit = process.env.DATABASE_URL?.trim();
    if (explicit && isMongo(explicit)) {
      process.env.PRISMA_DATABASE_URL = buildClean(explicit);
      console.log("[instrumentation] PRISMA_DATABASE_URL set from DATABASE_URL.");
      return;
    }

    const base = process.env.MONGO_URL?.trim();
    if (base && isMongo(base)) {
      process.env.PRISMA_DATABASE_URL = buildClean(base);
      console.log("[instrumentation] PRISMA_DATABASE_URL set from MONGO_URL.");
      return;
    }

    console.error(
      "[instrumentation] Could not build PRISMA_DATABASE_URL — neither DATABASE_URL nor MONGO_URL is a valid MongoDB DSN."
    );
  } catch (err) {
    console.error("[instrumentation] Failed to build PRISMA_DATABASE_URL:", err);
  }
}
