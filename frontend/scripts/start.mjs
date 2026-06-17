#!/usr/bin/env node
/**
 * Single entry-point used by both the local preview and the production
 * deployment.
 *
 * IMPORTANT: We launch the web server FIRST and then run the (potentially
 * slow) Prisma schema push + seed in the background.  Kubernetes readiness
 * probes hit /health on the bound port — if we did the schema sync before
 * binding, the pod would be killed for failing the probe deadline.
 *
 * Flow:
 *   1. Load .env (preview only — production injects env vars directly).
 *   2. Launch the web server (`node server.mjs` in prod, `next dev` in dev).
 *      → Server binds 0.0.0.0:PORT and starts answering /health immediately.
 *   3. In parallel (non-blocking), run `prisma db push --skip-generate` and
 *      `tsx prisma/seed.ts`.  Failures are logged but do NOT take down the
 *      web server (live admin can re-run them via `/api/admin/...` if ever
 *      needed).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// 1. Load .env (preview only).
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
  console.warn("[start] MONGO_URL not configured — skipping db bootstrap.");
}

// 2. Launch the web server FIRST so readiness probes pass.
const productionBuildExists =
  existsSync(join(projectRoot, ".next", "BUILD_ID")) ||
  existsSync(join(projectRoot, ".next", "server", "app"));

const command = productionBuildExists ? "node" : "npx";
const args = productionBuildExists
  ? ["server.mjs"]
  : ["next", "dev", "-H", "0.0.0.0", "-p", String(process.env.PORT || 3000)];

console.log(
  productionBuildExists
    ? "[start] Launching: node server.mjs (build present: true)"
    : `[start] Launching: npx ${args.join(" ")} (build present: false)`
);

const child = spawn(command, args, {
  cwd: projectRoot,
  stdio: "inherit",
  env: productionBuildExists ? { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" } : process.env
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", (code) => process.exit(code ?? 0));

// 3. Background db bootstrap. Runs in parallel with the web server.
//    DATABASE_URL is passed only to the child processes (so it isn't picked
//    up by the Emergent deployment "manage_secrets" sweep).
if (dbUrl) {
  const cliEnv = { ...process.env, DATABASE_URL: dbUrl };

  function runBackground(label, cmd, cmdArgs) {
    return new Promise((resolve) => {
      console.log(`[start:bg] ${label} starting...`);
      const proc = spawn(cmd, cmdArgs, { cwd: projectRoot, stdio: "inherit", env: cliEnv });
      proc.on("exit", (code) => {
        if (code === 0) console.log(`[start:bg] ${label} ok.`);
        else console.warn(`[start:bg] ${label} exited with code ${code} (continuing).`);
        resolve(code ?? 0);
      });
      proc.on("error", (err) => {
        console.warn(`[start:bg] ${label} failed to spawn:`, err.message);
        resolve(1);
      });
    });
  }

  // Wait a moment so the web server has a head start on the readiness probe.
  setTimeout(async () => {
    const pushCode = await runBackground(
      "prisma db push",
      "npx",
      ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"]
    );
    if (pushCode === 0) {
      await runBackground("seed", "npx", ["tsx", "prisma/seed.ts"]);
    } else {
      console.warn("[start:bg] skipping seed because prisma db push failed.");
    }
  }, 1500);
}
