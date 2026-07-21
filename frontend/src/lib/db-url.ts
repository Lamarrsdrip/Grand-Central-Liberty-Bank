/**
 * Build a Prisma-compatible MongoDB connection string from the Emergent
 * platform's `MONGO_URL` + `DB_NAME` secrets. Prisma's CLI (db push, seed,
 * etc.) reads `DATABASE_URL` directly from `process.env`, so we synthesise
 * it on the fly when only `MONGO_URL` is provided.
 *
 * In the local preview, `.env` already sets `DATABASE_URL` explicitly, so
 * this helper just hands that value back.
 */
export function buildMongoDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const base = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || "grand_central_liberty_bank";
  if (!base) {
    throw new Error("DATABASE_URL or MONGO_URL must be configured.");
  }

  const url = new URL(base);
  url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}
