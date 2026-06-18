#!/usr/bin/env node
/**
 * Reset or create the admin account.
 * Usage: node scripts/reset-admin.mjs [email] [password]
 *
 * Example:
 *   node scripts/reset-admin.mjs admin@grandcentrallibertybank.com "SecureAdmin2026!"
 *
 * Falls back to env vars SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD when args omitted.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ── Load .env (dev preview) ──────────────────────────────────────────────────
const envPath = join(projectRoot, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ── Build PRISMA_DATABASE_URL ────────────────────────────────────────────────
const REJECTED = ["timeoutms", "timeout"];
const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";
const isMongo = (s) => s.startsWith("mongodb://") || s.startsWith("mongodb+srv://");

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

const dbUrl = (process.env.DATABASE_URL?.trim() && isMongo(process.env.DATABASE_URL.trim()))
  ? buildClean(process.env.DATABASE_URL.trim())
  : process.env.MONGO_URL?.trim() ? buildClean(process.env.MONGO_URL.trim()) : null;

if (!dbUrl) {
  console.error("ERROR: Set DATABASE_URL (mongodb://) or MONGO_URL before running this script.");
  process.exit(1);
}

process.env.PRISMA_DATABASE_URL = dbUrl;

// ── Args / credentials ───────────────────────────────────────────────────────
const adminEmail    = process.argv[2] || process.env.SEED_ADMIN_EMAIL || "admin@grandcentrallibertybank.com";
const adminPassword = process.argv[3] || process.env.SEED_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error("ERROR: Provide password as second argument or set SEED_ADMIN_PASSWORD env var.");
  console.error("  node scripts/reset-admin.mjs admin@grandcentrallibertybank.com 'YourPassword!'");
  process.exit(1);
}

// ── Dynamic imports (after env is set) ──────────────────────────────────────
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({ datasourceUrl: dbUrl });

async function main() {
  console.log(`[reset-admin] Connecting to MongoDB…`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date()
      }
    });
    console.log(`[reset-admin] ✅ Updated existing admin: ${adminEmail}`);
  } else {
    await prisma.user.create({
      data: {
        firstName: "Avery",
        lastName: "Sterling",
        email: adminEmail,
        phone: "+12025550199",
        country: "United States",
        address: "200 Liberty Plaza, New York, NY",
        dateOfBirth: new Date("1984-02-14"),
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date()
      }
    });
    console.log(`[reset-admin] ✅ Created new admin: ${adminEmail}`);
  }

  console.log(`[reset-admin] ─────────────────────────────────────`);
  console.log(`[reset-admin]   Email:    ${adminEmail}`);
  console.log(`[reset-admin]   Password: ${adminPassword}`);
  console.log(`[reset-admin] ─────────────────────────────────────`);
  console.log(`[reset-admin] Admin login is ready.`);
}

main()
  .catch((err) => { console.error("[reset-admin] FAILED:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
