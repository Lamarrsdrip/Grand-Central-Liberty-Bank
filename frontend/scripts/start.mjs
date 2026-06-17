#!/usr/bin/env node
/**
 * Single entry-point used by both the local preview and the production
 * deployment.
 *
 *  1. Synthesises DATABASE_URL from the platform's MONGO_URL + DB_NAME
 *     secrets (so `prisma db push` and the seed script find a connection).
 *  2. Boots Next.js immediately so readiness probes can reach /health.
 *  3. Pushes the Prisma schema and runs the idempotent seed script in the
 *     background. Bootstrap failures log warnings but never take down the web
 *     process.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
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

const backgroundChildren = new Set();

function runBackgroundCommand(label, command, args, env) {
  return new Promise((resolve) => {
    console.log(`[start:bg] ${label} starting...`);
    const processRef = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      env
    });
    backgroundChildren.add(processRef);

    processRef.on("error", (error) => {
      backgroundChildren.delete(processRef);
      console.warn(`[start:bg] ${label} failed to start:`, error.message);
      resolve(false);
    });

    processRef.on("exit", (code) => {
      backgroundChildren.delete(processRef);
      if (code === 0) {
        console.log(`[start:bg] ${label} ok.`);
        resolve(true);
        return;
      }
      console.warn(`[start:bg] ${label} exited with status ${code}; web server remains online.`);
      resolve(false);
    });
  });
}

function startDatabaseBootstrap() {
  if (!dbUrl) return;

  // DATABASE_URL is only needed for the Prisma CLI subprocesses below.
  // We DO NOT set it on the parent process.env so it isn't picked up by
  // the Emergent deployment "manage_secrets" sweep (which copies env vars
  // from the running preview pod into production secrets).
  const cliEnv = { ...process.env, DATABASE_URL: dbUrl };

  setTimeout(async () => {
    const pushed = await runBackgroundCommand(
      "prisma db push",
      "npx",
      ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
      cliEnv
    );

    if (!pushed) return;

    await runBackgroundCommand("seed", "npx", ["tsx", "prisma/seed.ts"], cliEnv);
  }, 0);
}

// Boot the app. Production uses the custom server so Socket.IO and the
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

startDatabaseBootstrap();

function shutdown(signal) {
  for (const processRef of backgroundChildren) processRef.kill(signal);
  child.kill(signal);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
child.on("exit", (code) => process.exit(code ?? 0));
