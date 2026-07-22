/**
 * Next.js instrumentation hook — runs once when the server process initialises,
 * before any route module is imported or evaluated.
 *
 * Responsibilities:
 *  1. Write PRISMA_DATABASE_URL from MONGO_URL before the Prisma client loads.
 *  2. Validate critical production configuration without mutating data.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertCriticalServerConfig } = await import("@/lib/config");
  assertCriticalServerConfig();
  const { buildMongoDatabaseUrl } = await import("@/lib/db-url");
  buildMongoDatabaseUrl();
}
