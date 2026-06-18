#!/usr/bin/env node
/**
 * Reset or create the admin account — no transactions, no replica-set required.
 * Uses $runCommandRaw for writes (same pattern as register route).
 *
 * Usage:
 *   node scripts/reset-admin.mjs [email] [password]
 *
 * Example:
 *   node scripts/reset-admin.mjs admin@gclbank.local "AdminPassphrase!2026"
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ── Load .env if present ─────────────────────────────────────────────────────
const envPath = join(projectRoot, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ── Build clean MongoDB URL (strip bad params) ───────────────────────────────
const REJECTED = ["timeoutms", "timeout"];
const dbName   = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";
const isMongo  = (s) => s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");

function stripParam(str, name) {
  const re = new RegExp(`([?&])${name}=[^&]*`, "gi");
  const s = str.replace(re, (_, sep) => (sep === "?" ? "?" : ""));
  return s.replace(/\?&/g, "?").replace(/&&+/g, "&").replace(/[?&]$/, "");
}

function buildClean(raw) {
  let str = raw;
  for (const p of REJECTED) str = stripParam(str, p);
  const url = new URL(str);
  if (dbName) url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}

const rawUrl = (process.env.DATABASE_URL?.trim() && isMongo(process.env.DATABASE_URL.trim()))
  ? process.env.DATABASE_URL.trim()
  : process.env.MONGO_URL?.trim() ?? null;

if (!rawUrl) {
  console.error("ERROR: Set DATABASE_URL (mongodb://) or MONGO_URL before running this script.");
  process.exit(1);
}

const dbUrl = buildClean(rawUrl);
process.env.PRISMA_DATABASE_URL = dbUrl;

// ── Credentials ──────────────────────────────────────────────────────────────
const adminEmail    = process.argv[2] || process.env.SEED_ADMIN_EMAIL || "admin@gclbank.local";
const adminPassword = process.argv[3] || process.env.SEED_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error("ERROR: Provide password as second arg or SEED_ADMIN_PASSWORD env var.");
  console.error("  node scripts/reset-admin.mjs admin@gclbank.local 'AdminPassphrase!2026'");
  process.exit(1);
}

// ── Dynamic imports ──────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({ datasourceUrl: dbUrl });

async function main() {
  console.log("[reset-admin] Connecting to MongoDB…");

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const now = new Date().toISOString();

  // Check if admin exists using a read (reads never need replica-set)
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`[reset-admin] Found existing user ${adminEmail} — updating via updateOne command…`);

    // Use raw MongoDB update command — no transactions, no replica-set needed
    await prisma.$runCommandRaw({
      update: "User",
      updates: [
        {
          q: { email: adminEmail },
          u: {
            $set: {
              passwordHash,
              role: "ADMIN",
              status: "ACTIVE",
              emailVerifiedAt: { $date: now },
              updatedAt: { $date: now }
            }
          }
        }
      ],
      writeConcern: { w: 1 }
    });

    console.log(`[reset-admin] ✅ Admin updated successfully.`);
  } else {
    console.log(`[reset-admin] No existing user found — creating new admin…`);

    const userId = randomBytes(12).toString("hex");

    await prisma.$runCommandRaw({
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
    });

    console.log(`[reset-admin] ✅ Admin created successfully.`);
  }

  console.log(`[reset-admin] ─────────────────────────────────────`);
  console.log(`[reset-admin]   Email:    ${adminEmail}`);
  console.log(`[reset-admin]   Password: ${adminPassword}`);
  console.log(`[reset-admin] ─────────────────────────────────────`);
}

main()
  .catch((err) => { console.error("[reset-admin] FAILED:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
