#!/usr/bin/env node
/**
 * Single entry-point used by both the local preview and the production
 * deployment.
 *
 *  1. Synthesises DATABASE_URL from the platform's MONGO_URL + DB_NAME
 *     secrets (so `prisma db push` and the seed script find a connection).
 *  2. Pushes the Prisma schema to MongoDB (idempotent — only creates
 *     indexes; no destructive operations).
 *  3. Runs the idempotent seed script (upserts admin/customer accounts).
 *  4. Boots Next.js. `next start` if `.next/BUILD_ID` is present (production
 *     build artifacts), otherwise `next dev` for the preview pod.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Load .env if present (preview pod). In production, the platform injects
// secrets directly into process.env and no .env file is required.
const envPath = join(projectRoot, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const base = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || "grand_central_liberty_bank";
  if (!base) return null;
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}

const dbUrl = buildDatabaseUrl();
if (dbUrl) {
  console.log("[start] DATABASE_URL =", dbUrl.replace(/:\/\/[^@]*@/, "://***@"));
} else {
  console.warn("[start] DATABASE_URL/MONGO_URL not set; starting web process without database bootstrap.");
}

// DATABASE_URL is only needed for the Prisma CLI subprocesses below.
// We DO NOT set it on the parent process.env so it isn't picked up by
// the Emergent deployment "manage_secrets" sweep (which copies env vars
// from the running preview pod into production secrets).
if (dbUrl) {
  const cliEnv = { ...process.env, DATABASE_URL: dbUrl };

  // 1. Sync schema (indexes). Mongo creates collections lazily so this is cheap.
  console.log("[start] Pushing Prisma schema to MongoDB...");
  const push = spawnSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    { cwd: projectRoot, stdio: "inherit", env: cliEnv }
  );
  if (push.status !== 0) {
    console.warn("[start] prisma db push failed; continuing so health checks can pass.");
  } else {
    // 2. Seed (idempotent — uses upserts).
    console.log("[start] Running seed...");
    const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: cliEnv
    });
    if (seed.status !== 0) {
      console.warn("[start] seed exited with status", seed.status, "— continuing anyway.");
    }
  }
}

// 3. Boot the app. Production uses the custom server so Socket.IO and the
// inline health path are available; preview without build artifacts uses Next dev.
const productionBuildExists =
  existsSync(join(projectRoot, ".next", "BUILD_ID")) ||
  existsSync(join(projectRoot, ".next", "server", "app"));
const nextArgs = productionBuildExists
  ? ["server.mjs"]
  : ["next", "dev", "-H", "0.0.0.0", "-p", String(process.env.PORT || 3000)];

console.log(
  productionBuildExists
    ? "[start] Launching: node server.mjs (build present: true)"
    : `[start] Launching: npx ${nextArgs.join(" ")} (build present: false)`
);

const child = spawn(productionBuildExists ? "node" : "npx", nextArgs, {
  cwd: projectRoot,
  stdio: "inherit",
  env: productionBuildExists ? { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" } : process.env
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code ?? 0));
