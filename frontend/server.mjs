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

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const base = process.env.MONGO_URL;
  if (!base) return null;
  const dbName = process.env.DB_NAME || "grand_central_liberty_bank";
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  if (!url.searchParams.has("retryWrites")) url.searchParams.set("retryWrites", "true");
  if (!url.searchParams.has("w")) url.searchParams.set("w", "majority");
  return url.toString();
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

async function authenticateSocket(socket) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured for live chat.");
  }
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
    const ticket = await getPrisma().supportTicket.findFirst({
      where:
        user.role === "ADMIN"
          ? { id: ticketId }
          : { id: ticketId, userId: user.id }
    });
    if (ticket) {
      socket.join(`ticket:${ticket.id}`);
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
      const recipientId = user.id === ticket.userId ? ticket.assignedAdminId : ticket.userId;
      if (recipientId) {
        await getPrisma().notification.create({
          data: {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: "New support message",
            body: `${user.firstName} sent a new support message.`
          }
        });
      }
      await getPrisma().auditLog.create({
        data: {
          actorId: user.id,
          action: "SUPPORT_MESSAGE_SENT",
          entity: "SupportTicket",
          entityId: ticket.id,
          metadata: { via: "socket" }
        }
      });
      socket.to(`ticket:${ticket.id}`).emit("support_message", {
        ticketId: ticket.id,
        message: payload
      });
      ack?.({ ok: true, message: payload });
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
