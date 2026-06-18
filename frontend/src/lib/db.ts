import { PrismaClient } from "@prisma/client";
import { buildMongoDatabaseUrl } from "@/lib/db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaClient = globalForPrisma.prisma;

function getPrismaClient() {
  if (prismaClient) return prismaClient;

  // buildMongoDatabaseUrl() resolves MONGO_URL / DATABASE_URL → a clean
  // mongodb:// string and writes it to process.env.PRISMA_DATABASE_URL.
  // We ALSO pass it via the datasources override so this module never relies
  // on which env-var name is baked into the generated Prisma client — the
  // explicit override always wins, even when the cached generated client
  // still references DATABASE_URL from a previous schema version.
  const url = buildMongoDatabaseUrl();

  prismaClient = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(getPrismaClient()) : value;
  }
});
