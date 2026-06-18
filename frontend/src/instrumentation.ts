/**
 * Next.js instrumentation hook — runs once when the server process initialises,
 * before any route module is imported or evaluated.
 *
 * Responsibilities:
 *  1. Write PRISMA_DATABASE_URL from MONGO_URL before the Prisma client loads.
 *  2. Seed the admin user if they don't exist in the database yet.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const REJECTED = ["timeoutms", "timeout"];
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";
  const isMongo = (s: string) =>
    s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");

  function stripParam(str: string, name: string): string {
    const re = new RegExp(`([?&])${name}=[^&]*`, "gi");
    const s = str.replace(re, (_, sep) => (sep === "?" ? "?" : ""));
    return s.replace(/\?&/g, "?").replace(/&&+/g, "&").replace(/[?&]$/, "");
  }

  function buildClean(raw: string): string {
    let str = raw;
    for (const p of REJECTED) str = stripParam(str, p);
    const url = new URL(str);
    if (dbName) url.pathname = `/${dbName}`;
    if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
    if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
    if (!url.searchParams.has("serverSelectionTimeoutMS")) url.searchParams.set("serverSelectionTimeoutMS", "5000");
    if (!url.searchParams.has("connectTimeoutMS")) url.searchParams.set("connectTimeoutMS", "10000");
    return url.toString();
  }

  let dbUrl: string | null = null;

  try {
    const explicit = process.env.DATABASE_URL?.trim();
    if (explicit && isMongo(explicit)) {
      dbUrl = buildClean(explicit);
      process.env.PRISMA_DATABASE_URL = dbUrl;
      console.log("[instrumentation] PRISMA_DATABASE_URL set from DATABASE_URL.");
    } else {
      const base = process.env.MONGO_URL?.trim();
      if (base && isMongo(base)) {
        dbUrl = buildClean(base);
        process.env.PRISMA_DATABASE_URL = dbUrl;
        console.log("[instrumentation] PRISMA_DATABASE_URL set from MONGO_URL.");
      } else {
        console.error(
          "[instrumentation] Could not build PRISMA_DATABASE_URL — neither DATABASE_URL nor MONGO_URL is a valid MongoDB DSN."
        );
      }
    }
  } catch (err) {
    console.error("[instrumentation] Failed to build PRISMA_DATABASE_URL:", err);
  }

  // Seed admin user — runs on every startup, no-ops if already present.
  if (dbUrl) {
    await seedAdminUser(dbUrl);
    await purgeFakeSeedData(dbUrl);
  }
}

async function seedAdminUser(dbUrl: string) {
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || "admin@gclbank.local"
  ).toLowerCase().trim();
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || "AdminPassphrase!2026";

  try {
    const { PrismaClient } = await import("@prisma/client");
    const { randomBytes } = await import("node:crypto");
    const bcrypt = (await import("bcryptjs")).default;

    // Create a dedicated client with the URL we just set — bypasses singleton timing.
    const prisma = new PrismaClient({ datasourceUrl: dbUrl });

    try {
      const existing = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true }
      });

      if (existing) {
        console.log(`[instrumentation] Admin user found (${adminEmail}) — skipping seed.`);
        return;
      }

      console.log(`[instrumentation] Admin user not found — creating ${adminEmail}...`);

      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const userId = randomBytes(12).toString("hex");
      const now = new Date().toISOString();

      const result = await prisma.$runCommandRaw({
        insert: "User",
        documents: [
          {
            _id: { $oid: userId },
            firstName: "Avery",
            lastName: "Sterling",
            email: adminEmail,
            phone: "+12025550199",
            country: "United States",
            address: "200 Liberty Plaza, New York, NY",
            dateOfBirth: { $date: "1984-02-14T00:00:00.000Z" },
            passwordHash,
            role: "ADMIN",
            status: "ACTIVE",
            twoFactorEnabled: false,
            preferredLocale: "en",
            themePreference: "system",
            emailVerifiedAt: { $date: now },
            createdAt: { $date: now },
            updatedAt: { $date: now }
          }
        ],
        writeConcern: { w: 1 }
      }) as { ok?: number; n?: number };

      if (result?.ok !== 1 || (result?.n ?? 0) < 1) {
        console.error("[instrumentation] Admin insert command returned unexpected result:", JSON.stringify(result));
        return;
      }

      // Verify it's readable immediately
      const created = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true, role: true, status: true }
      });

      if (!created) {
        console.error("[instrumentation] Admin insert succeeded but findUnique returned null — check collection.");
        return;
      }

      console.log(`[instrumentation] ✓ Admin seeded: ${adminEmail} role=${created.role} status=${created.status}`);
      console.log(`[instrumentation] ✓ Password set to: ${adminPassword === "AdminPassphrase!2026" ? "(default)" : "(from SEED_ADMIN_PASSWORD)"}`);
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error("[instrumentation] Admin seed failed (non-fatal):", err);
  }
}

async function purgeFakeSeedData(dbUrl: string) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ datasourceUrl: dbUrl });

    try {
      // Delete the hardcoded "Olivia Bennett" transfer injected by the old seed.
      // Identified by the specific account number — will never match a real transfer.
      const delTransfer = await prisma.$runCommandRaw({
        delete: "TransferRequest",
        deletes: [{ q: { beneficiaryAccount: "9044558800", beneficiaryName: "Olivia Bennett" }, limit: 0 }],
        writeConcern: { w: 1 }
      }) as { n?: number };

      if ((delTransfer?.n ?? 0) > 0) {
        console.log(`[instrumentation] Purged ${delTransfer.n} fake seed transfer(s) (Olivia Bennett).`);
      }

      // Delete the seeded "Wire transfer review" support ticket and its messages.
      // Identified by the exact subject and the "Hello Alexander" ghost message.
      const seedTickets = await prisma.supportTicket.findMany({
        where: { subject: "Wire transfer review" },
        select: { id: true, messages: { select: { id: true, body: true } } }
      });

      for (const ticket of seedTickets) {
        const hasSeedMessage = ticket.messages.some((m) => m.body.includes("Hello Alexander"));
        if (!hasSeedMessage) continue;

        await prisma.$runCommandRaw({
          delete: "SupportMessage",
          deletes: [{ q: { ticketId: { $oid: ticket.id } }, limit: 0 }],
          writeConcern: { w: 1 }
        });
        await prisma.$runCommandRaw({
          delete: "SupportTicket",
          deletes: [{ q: { _id: { $oid: ticket.id } }, limit: 1 }],
          writeConcern: { w: 1 }
        });
        console.log(`[instrumentation] Purged fake seed support ticket (Wire transfer review / ${ticket.id}).`);
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error("[instrumentation] Seed data purge failed (non-fatal):", err);
  }
}
