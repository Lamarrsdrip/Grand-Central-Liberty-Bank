import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Params that Prisma's MongoDB connector rejects.
const MONGO_REJECTED_PARAMS = ["timeoutms", "timeout"];

// Strip a query param by name, case-insensitively, via regex on the raw string.
function stripParam(str, name) {
  const re = new RegExp(`([?&])${name}=[^&]*`, "gi");
  let s = str.replace(re, (_, sep) => (sep === "?" ? "?" : ""));
  return s.replace(/\?&/g, "?").replace(/&&+/g, "&").replace(/[?&]$/, "");
}

function cleanMongoUrl(raw, dbName) {
  let str = raw;
  for (const p of MONGO_REJECTED_PARAMS) str = stripParam(str, p);
  const url = new URL(str);
  const resolvedDbName = dbName || url.pathname.replace(/^\//, "") || "grand_central_liberty_bank";
  url.pathname = `/${resolvedDbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  if (!url.searchParams.has("serverSelectionTimeoutMS")) url.searchParams.set("serverSelectionTimeoutMS", "5000");
  if (!url.searchParams.has("connectTimeoutMS")) url.searchParams.set("connectTimeoutMS", "10000");
  return url.toString();
}

function buildDatabaseUrl() {
  // schema.prisma now reads PRISMA_DATABASE_URL, not DATABASE_URL.
  // If instrumentation.ts already set it, use it directly.
  const already = process.env.PRISMA_DATABASE_URL?.trim();
  if (already) return already;

  const explicit = process.env.DATABASE_URL?.trim();
  const dbName = process.env.DB_NAME?.trim() || "";

  let clean;
  if (explicit && (explicit.startsWith("mongodb://") || explicit.startsWith("mongodb+srv://"))) {
    clean = cleanMongoUrl(explicit, dbName);
    if (clean !== explicit) {
      console.log("[server] Removed invalid params from DATABASE_URL (e.g. timeoutms).");
    }
  } else {
    if (explicit) {
      const proto = explicit.split("://")[0] || "(empty)";
      console.error(
        `[server] DATABASE_URL uses protocol "${proto}://" — ignoring. ` +
          "Building from MONGO_URL instead."
      );
    }
    const base = process.env.MONGO_URL?.trim();
    if (!base) return null;
    clean = cleanMongoUrl(base, dbName);
    console.log("[server] MongoDB URL built from MONGO_URL.");
  }

  // Write to PRISMA_DATABASE_URL so schema.prisma and Prisma CLI both find it.
  process.env.PRISMA_DATABASE_URL = clean;
  return clean;
}

const BUILD_FINGERPRINT = "2026-07-22T-vercel-polling-chat";

// Eagerly resolve the MongoDB URL before app.prepare() so that
// instrumentation.ts can read PRISMA_DATABASE_URL when it runs inside prepare().
buildDatabaseUrl();

function sendHealth(res) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "Grand Central Liberty Bank",
      build: BUILD_FINGERPRINT,
      databaseConfigured: Boolean(process.env.PRISMA_DATABASE_URL || process.env.MONGO_URL),
      timestamp: new Date().toISOString()
    })
  );
}

await app.prepare();

const httpServer = createServer((req, res) => {
  const path = req.url?.split("?")[0];
  if (path === "/health" || path === "/api/health") {
    sendHealth(res);
    return;
  }
  handler(req, res);
});
httpServer.listen(port, hostname, () => {
  console.log(`Grand Central Liberty Bank ready on http://${hostname}:${port}`);
});

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
