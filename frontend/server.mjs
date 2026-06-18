import { createHash } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { jwtVerify } from "jose";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
let prisma;

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
        process.env.DATABASE_URL = clean;
        console.log("[server] Removed invalid params from DATABASE_URL (e.g. timeoutms).");
      }
      return clean;
    }
    const proto = explicit.split("://")[0] || "(empty)";
    console.error(
      `[server] DATABASE_URL uses protocol "${proto}://" — expected "mongodb://" or "mongodb+srv://". ` +
        "Overwriting process.env.DATABASE_URL with MONGO_URL for this session."
    );
  }

  const base = process.env.MONGO_URL?.trim();
  if (!base) return null;
  const clean = cleanMongoUrl(base, dbName);
  // Patch env so all downstream code reading process.env.DATABASE_URL gets a valid MongoDB URL.
  process.env.DATABASE_URL = clean;
  console.log("[server] DATABASE_URL patched from MONGO_URL for this session.");
  return clean;
}

function getPrisma() {
  if (prisma) return prisma;
  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Database is not configured.");
  }
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  return prisma;
}

function sendHealth(res) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      ok: true,
      service: "Grand Central Liberty Bank",
      timestamp: new Date().toISOString()
    })
  );
}

function parseCookie(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function authSecret() {
  const raw =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CSRF_SECRET ||
    process.env.SETTINGS_MASTER_KEY;
  if (!raw) {
    throw new Error("JWT secret is not configured.");
  }
  return raw.length >= 32 ? raw : createHash("sha256").update(raw).digest("hex");
}

async function authenticateSocket(socket) {
  const secret = authSecret();
  const token = parseCookie(socket.handshake.headers.cookie).gclb_session;
  if (!token) {
    throw new Error("Missing session cookie.");
  }
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  const session = await getPrisma().session.findFirst({
    where: {
      id: payload.jti,
      userId: payload.sub,
      tokenHash: sha256(token),
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
  if (!session || session.revokedAt || session.user.status === "SUSPENDED") {
    throw new Error("Invalid session.");
  }

  return session.user;
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
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: { origin: process.env.APP_URL ?? `http://localhost:${port}`, credentials: true }
});

io.on("connection", async (socket) => {
  let user;
  try {
    user = await authenticateSocket(socket);
  } catch (error) {
    socket.emit("support_error", "Live chat authentication failed. Please refresh and try again.");
    socket.disconnect(true);
    return;
  }

  socket.on("join_ticket", async (ticketId) => {
    try {
      const ticket = await getPrisma().supportTicket.findFirst({
        where:
          user.role === "ADMIN"
            ? { id: ticketId }
            : { id: ticketId, userId: user.id }
      });
      if (ticket) {
        socket.join(`ticket:${ticket.id}`);
      }
    } catch (error) {
      console.error("[socket] join_ticket failed", error);
    }
  });

  socket.on("send_support_message", async (input, ack) => {
    try {
      const body = String(input.body ?? "").replace(/[<>]/g, "").trim().slice(0, 5000);
      if (!body) {
        throw new Error("Message body is required.");
      }
      const ticket = await getPrisma().supportTicket.findFirst({
        where:
          user.role === "ADMIN"
            ? { id: input.ticketId }
            : { id: input.ticketId, userId: user.id }
      });
      if (!ticket) {
        throw new Error("Support ticket was not found.");
      }
      const message = await getPrisma().supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          body
        }
      });
      socket.join(`ticket:${ticket.id}`);
      await getPrisma().supportTicket.update({
        where: { id: ticket.id },
        data: { status: user.role === "ADMIN" ? "ACTIVE" : ticket.status, updatedAt: new Date() }
      });
      const payload = {
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role,
        attachmentUrl: message.attachmentUrl,
        createdAt: message.createdAt.toISOString()
      };
      // Deliver to room and ack sender first — side-effects must not block delivery.
      socket.to(`ticket:${ticket.id}`).emit("support_message", {
        ticketId: ticket.id,
        message: payload
      });
      ack?.({ ok: true, message: payload });
      // Best-effort side-effects — P2031 or network errors must not affect delivery.
      const recipientId = user.id === ticket.userId ? ticket.assignedAdminId : ticket.userId;
      if (recipientId) {
        getPrisma().notification.create({
          data: {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: "New support message",
            body: `${user.firstName} sent a new support message.`
          }
        }).catch((error) => console.error("[socket] notification.create failed", error));
      }
      getPrisma().auditLog.create({
        data: {
          actorId: user.id,
          action: "SUPPORT_MESSAGE_SENT",
          entity: "SupportTicket",
          entityId: ticket.id,
          metadata: { via: "socket" }
        }
      }).catch((error) => console.error("[socket] auditLog.create failed", error));
    } catch (error) {
      console.error("[socket] support message failed", error);
      ack?.({ error: "Message failed. Please try again." });
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`Grand Central Liberty Bank ready on http://${hostname}:${port}`);
});

process.on("SIGTERM", async () => {
  await prisma?.$disconnect().catch(() => undefined);
  httpServer.close(() => process.exit(0));
});
