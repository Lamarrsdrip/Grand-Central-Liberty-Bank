import { PrismaClient } from "@prisma/client";
import { buildMongoDatabaseUrl } from "@/lib/db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let prismaClient = globalForPrisma.prisma;

function getPrismaClient() {
  if (prismaClient) return prismaClient;

  // Ensure PRISMA_DATABASE_URL is set before PrismaClient is instantiated.
  // instrumentation.ts runs earlier and should have already done this,
  // but buildMongoDatabaseUrl() is a safe second layer.
  buildMongoDatabaseUrl();

  prismaClient = new PrismaClient({
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
