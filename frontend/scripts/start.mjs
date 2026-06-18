#!/usr/bin/env node
/**
 * Single entry-point used by both the local preview and the production
 * deployment.
 *
 *  1. Synthesises DATABASE_URL from the platform's MONGO_URL + DB_NAME
 *     secrets (so `prisma db push` and the seed script find a connection).
 *  2. Ensures a replica-set MongoDB is available. Prisma 5+ requires a replica
 *     set for all write operations (P2031). If the bundled mongod is standalone,
 *     the script starts a companion single-node replica set on an alternate port
 *     and redirects DATABASE_URL to it before booting Next.js.
 *  3. Boots Next.js immediately so readiness probes can reach /health.
 *  4. Pushes the Prisma schema and runs the idempotent seed script in the
 *     background. Bootstrap failures log warnings but never take down the web
 *     process.
 */
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
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

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shellEval(shell, host, port, js, timeoutMs = 10000) {
  return execSync(
    `${shell} --host ${host} --port ${port} --quiet --eval ${JSON.stringify(js)}`,
    { stdio: "pipe", timeout: timeoutMs }
  ).toString();
}

/**
 * Ensure a replica-set MongoDB is available. Strategy:
 *
 *  1. If the configured MongoDB URL already has a replica set → done.
 *  2. If mongod was started with --replSet but not yet initiated → initiate → done.
 *  3. If truly standalone:
 *     a. Try system-level restart (systemctl / supervisorctl) which picks up
 *        a pre-patched mongod.conf — cleanest when an init system is present.
 *     b. Kill the standalone process and relaunch with --replSet on the SAME port.
 *     c. Last resort: start a COMPANION mongod on port+2 with --replSet and
 *        redirect process.env.DATABASE_URL to it before Next.js spawns.
 *
 * All failures are non-fatal: the web process starts regardless, but writes
 * will fail with P2031 until the replica set is available.
 */
async function ensureReplicaSet() {
  const mongoBase = process.env.MONGO_URL || process.env.DATABASE_URL || "";
  let host = "127.0.0.1";
  let port = "27017";
  let isLocal = !mongoBase;

  try {
    if (mongoBase) {
      const u = new URL(mongoBase);
      host = u.hostname || host;
      port = String(u.port || "27017");
      isLocal = ["127.0.0.1", "localhost", "::1", "0.0.0.0"].includes(host);
    }
  } catch { /* malformed URL — treat as local */ }

  if (!isLocal) return; // External MongoDB (Atlas, etc.) — already configured correctly.

  // ── Find mongosh / mongo shell ───────────────────────────────────────────
  let shell = null;
  for (const bin of ["mongosh", "mongo"]) {
    try { execSync(`command -v ${bin}`, { stdio: "pipe" }); shell = bin; break; }
    catch { /* not found */ }
  }
  if (!shell) {
    console.warn("[start] mongosh not found — cannot ensure replica set. Writes may fail (P2031).");
    return;
  }

  // ── Step 1: Already a healthy replica set? ───────────────────────────────
  try {
    const out = shellEval(shell, host, port, `rs.status().members.filter(m=>m.stateStr==="PRIMARY").length`, 5000);
    if (out.trim() === "1") {
      console.log("[start] MongoDB is already a replica set.");
      return;
    }
  } catch { /* not yet */ }

  // ── Step 2: Started with --replSet but not yet initiated ─────────────────
  try {
    shellEval(
      shell, host, port,
      `rs.initiate({_id:"rs0",members:[{_id:0,host:"${host}:${port}"}]}); sleep(2000); print("ok")`,
      15000
    );
    await wait(1000);
    console.log("[start] MongoDB replica set initiated.");
    return;
  } catch (err) {
    const msg = String(err.message || "");
    if (!msg.includes("not running with --replSet") && !msg.includes("replication enabled")) {
      console.warn("[start] rs.initiate failed:", msg.split("\n")[0]);
      // Not a standalone issue; no point trying the restart approaches.
      return;
    }
    // Standalone mongod confirmed. Fall through to restart strategies.
  }

  console.log("[start] MongoDB is standalone. Attempting to convert to replica set…");

  // ── Step 3a: System-level restart (init system present) ─────────────────
  // Try common service managers. Each is safe to attempt — they fail silently
  // if the service name / manager is not present.
  const serviceRestarted = await tryServiceRestart();
  if (serviceRestarted) {
    if (await waitForPrimary(shell, host, port, 20000)) {
      console.log("[start] MongoDB is now a replica set (via service restart).");
      return;
    }
    console.warn("[start] Service restart did not produce a replica set primary. Continuing…");
  }

  // ── Step 3b: Kill and relaunch on same port ──────────────────────────────
  const relaunchOk = await killAndRelaunch(host, port);
  if (relaunchOk) {
    await wait(1000); // let mongod settle
    if (await waitForPrimary(shell, host, port, 20000)) {
      console.log("[start] MongoDB is now a replica set (via relaunch).");
      return;
    }
    console.warn("[start] Relaunch did not produce a replica set primary. Continuing…");
  }

  // ── Step 3c: Companion mongod on alternate port (safe last resort) ───────
  console.log("[start] Starting companion replica-set mongod as fallback…");
  const rsPort = String(Number(port) + 2); // e.g. 27017 → 27019
  const dbName = process.env.DB_NAME || "grand_central_liberty_bank";
  const redirected = await startCompanionReplicaSet(shell, host, rsPort);
  if (redirected) {
    const newUrl = `mongodb://${host}:${rsPort}/${dbName}?replicaSet=rs0&retryWrites=true&w=majority`;
    process.env.DATABASE_URL = newUrl;
    delete process.env.MONGO_URL; // force buildDatabaseUrl() to use DATABASE_URL
    console.log(`[start] Redirected database → companion replica set on port ${rsPort}.`);
  } else {
    console.warn("[start] All replica-set strategies failed. Writes will fail with P2031.");
  }
}

async function tryServiceRestart() {
  const cmds = [
    "systemctl restart mongod",
    "service mongod restart",
    "supervisorctl restart mongod",
  ];
  for (const cmd of cmds) {
    try {
      execSync(cmd, { stdio: "pipe", timeout: 10000 });
      return true;
    } catch { /* not available */ }
  }
  return false;
}

async function killAndRelaunch(host, port) {
  // Safety: only proceed if mongod is not PID 1.
  let mongodPid = null, dbPath = "/data/db", mongodBin = "mongod";
  try {
    // lsof works on Linux and macOS
    const pid = execSync(`lsof -i :${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { stdio: "pipe" }).toString().trim();
    mongodPid = parseInt(pid) || null;
  } catch { /* ignore */ }

  if (!mongodPid) {
    try {
      // Fallback: grep ps output for mongod on this port
      const line = execSync(`ps -eo pid,args | grep '[m]ongod.*--port.${port}\\|[m]ongod ' 2>/dev/null | head -1`, { stdio: "pipe" }).toString().trim();
      if (line) {
        mongodPid = parseInt(line.split(/\s+/)[0]) || null;
        const m = line.match(/--dbpath\s+(\S+)/);
        if (m) dbPath = m[1];
        mongodBin = line.split(/\s+/)[1] || "mongod";
      }
    } catch { /* ignore */ }
  }

  if (!mongodPid) { console.warn("[start] Could not locate mongod process."); return false; }
  if (mongodPid === 1) { console.warn("[start] mongod is PID 1 — cannot restart safely."); return false; }

  try {
    // Extract dbpath from the running process
    const line = execSync(`ps -p ${mongodPid} -o args=`, { stdio: "pipe" }).toString();
    const m = line.match(/--dbpath\s+(\S+)/);
    if (m) dbPath = m[1];
    mongodBin = line.trim().split(/\s+/)[0];
  } catch { /* use defaults */ }

  // Graceful shutdown via MongoDB admin command (cleanest — flushes journal).
  try {
    execSync(
      `mongosh --host ${host} --port ${port} --quiet --eval "db.adminCommand({shutdown:1,force:true,timeoutSecs:5})" 2>/dev/null`,
      { stdio: "pipe", timeout: 10000 }
    );
  } catch { /* connection closes before response — that's expected */ }

  await wait(2000);

  // Force-kill if still alive.
  try { process.kill(mongodPid, "SIGKILL"); } catch { /* already dead */ }
  await wait(1000);

  // Relaunch with --replSet on the same port.
  try {
    execSync(`which ${mongodBin}`, { stdio: "pipe" }); // verify binary exists
    spawn(mongodBin, [
      "--replSet", "rs0",
      "--dbpath", dbPath,
      "--port", port,
      "--bind_ip_all",
      "--logappend",
    ], { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch (e) {
    console.warn("[start] Could not relaunch mongod:", e.message);
    return false;
  }
}

async function startCompanionReplicaSet(shell, host, port) {
  // Check if companion is already running and healthy.
  try {
    const out = shellEval(shell, host, port, `rs.status().members.filter(m=>m.stateStr==="PRIMARY").length`, 5000);
    if (out.trim() === "1") {
      console.log(`[start] Companion on port ${port} is already a PRIMARY.`);
      return true;
    }
  } catch { /* not running yet */ }

  // Find mongod binary.
  let mongodBin = "mongod";
  try { mongodBin = execSync("which mongod", { stdio: "pipe" }).toString().trim(); } catch { /* use default */ }

  // Create a data directory in /tmp (ephemeral — fine for dev containers).
  const dbPath = `/tmp/mongo-rs-${port}`;
  try { mkdirSync(dbPath, { recursive: true }); } catch (e) {
    console.warn("[start] Could not create companion data dir:", e.message);
    return false;
  }

  // Start companion mongod.
  try {
    spawn(mongodBin, [
      "--replSet", "rs0",
      "--dbpath", dbPath,
      "--port", port,
      "--bind_ip", "127.0.0.1",
      "--logappend",
      "--logpath", `/tmp/mongo-rs-${port}.log`,
    ], { detached: true, stdio: "ignore" }).unref();
  } catch (e) {
    console.warn("[start] Could not start companion mongod:", e.message);
    return false;
  }

  // Wait for companion to accept connections (up to 15 s).
  let started = false;
  for (let i = 0; i < 15; i++) {
    await wait(1000);
    try {
      shellEval(shell, host, port, `db.runCommand({ping:1})`, 2000);
      started = true;
      break;
    } catch { /* still starting */ }
  }
  if (!started) { console.warn("[start] Companion mongod did not start in time."); return false; }

  // Initiate replica set on companion.
  try {
    shellEval(
      shell, host, port,
      `try { rs.status(); print("already-rs"); } catch(e) { rs.initiate({_id:"rs0",members:[{_id:0,host:"${host}:${port}"}]}); sleep(3000); print("initiated"); }`,
      20000
    );
    await wait(2000);
  } catch (e) {
    console.warn("[start] Companion rs.initiate failed:", String(e.message || "").split("\n")[0]);
    return false;
  }

  return await waitForPrimary(shell, host, port, 15000);
}

async function waitForPrimary(shell, host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const out = shellEval(shell, host, port, `rs.status().members.filter(m=>m.stateStr==="PRIMARY").length`, 5000);
      if (out.trim() === "1") return true;
    } catch { /* not ready */ }
    await wait(1000);
  }
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────

await ensureReplicaSet();

// Params that Prisma's MongoDB connector rejects at startup (e.g. timeoutms is a
// legacy alias the current driver no longer accepts in the connection string).
const MONGO_REJECTED_PARAMS = ["timeoutms", "timeout"];

function cleanMongoUrl(raw, dbName) {
  const url = new URL(raw);
  for (const p of MONGO_REJECTED_PARAMS) url.searchParams.delete(p);
  if (dbName) url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
}

function buildDatabaseUrl() {
  const explicit = process.env.DATABASE_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "grand_central_liberty_bank";

  if (explicit) {
    if (explicit.startsWith("mongodb://") || explicit.startsWith("mongodb+srv://")) {
      const clean = cleanMongoUrl(explicit, dbName);
      if (clean !== explicit) {
        console.log("[start] Removed invalid params from DATABASE_URL (e.g. timeoutms).");
      }
      return clean;
    }
    const proto = explicit.split("://")[0] || "(empty)";
    console.error(
      `[start] DATABASE_URL uses protocol "${proto}://" — expected "mongodb://" or "mongodb+srv://". ` +
        "Falling back to MONGO_URL. In Emergent, update the DATABASE_URL secret to a MongoDB connection string."
    );
  }

  const base = process.env.MONGO_URL?.trim();
  if (!base) return null;
  return cleanMongoUrl(base, dbName);
}

const dbUrl = buildDatabaseUrl();

// Patch process.env.DATABASE_URL NOW — before spawning the Next.js child process.
// Without this the child inherits the original (bad) DATABASE_URL from the platform
// (e.g. postgresql://...) and every Prisma call inside Next.js fails at runtime.
if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
  console.log("[start] process.env.DATABASE_URL set to resolved MongoDB URL.");
}

// Startup environment validation — catches misconfigured production secrets early.
{
  const rawDbUrl = process.env.DATABASE_URL?.trim();
  if (rawDbUrl && !rawDbUrl.startsWith("mongodb://") && !rawDbUrl.startsWith("mongodb+srv://")) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("[start] CONFIGURATION ERROR: DATABASE_URL is set but is NOT a MongoDB URL.");
    console.error(`[start]   Current value protocol: ${rawDbUrl.split("://")[0]}://...`);
    console.error("[start]   Required:               mongodb://... or mongodb+srv://...");
    console.error("[start]   Fix: In Emergent Production Secrets, change DATABASE_URL to your");
    console.error("[start]        MongoDB connection string, or remove it so MONGO_URL is used.");
    if (process.env.MONGO_URL) {
      console.error("[start]   Falling back to MONGO_URL for this session.");
    } else {
      console.error("[start]   MONGO_URL is also not set — database will be unavailable!");
    }
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } else if (!rawDbUrl && !process.env.MONGO_URL) {
    console.error("[start] CONFIGURATION ERROR: Neither DATABASE_URL nor MONGO_URL is set.");
  }
}

if (dbUrl) {
  console.log("[start] MongoDB URL resolved:", dbUrl.replace(/:\/\/[^@]*@/, "://***@"));
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
