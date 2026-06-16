import { createHash } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { jwtVerify } from "jose";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
const prisma = new PrismaClient();

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
  const session = await prisma.session.findFirst({
    where: {
      id: payload.jti,
      userId: payload.sub,
      tokenHash: sha256(token),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  });
  if (!session || session.user.status === "SUSPENDED") {
    throw new Error("Invalid session.");
  }

  return session.user;
}

await app.prepare();

const httpServer = createServer(handler);
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: { origin: process.env.APP_URL ?? `http://localhost:${port}`, credentials: true }
});

io.on("connection", async (socket) => {
  let user;
  try {
    user = await authenticateSocket(socket);
  } catch (error) {
    socket.emit("support_error", error instanceof Error ? error.message : "Authentication failed.");
    socket.disconnect(true);
    return;
  }

  socket.on("join_ticket", async (ticketId) => {
    const ticket = await prisma.supportTicket.findFirst({
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
      const ticket = await prisma.supportTicket.findFirst({
        where:
          user.role === "ADMIN"
            ? { id: input.ticketId }
            : { id: input.ticketId, userId: user.id }
      });
      if (!ticket) {
        throw new Error("Support ticket was not found.");
      }
      const message = await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          body: String(input.body ?? "").replace(/[<>]/g, "").slice(0, 5000)
        }
      });
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: user.role === "ADMIN" ? "ACTIVE" : ticket.status, updatedAt: new Date() }
      });
      io.to(`ticket:${ticket.id}`).emit("support_message", {
        ticketId: ticket.id,
        message: {
          id: message.id,
          body: message.body,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString()
        }
      });
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ error: error instanceof Error ? error.message : "Message failed." });
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`Grand Central Liberty Bank ready on http://${hostname}:${port}`);
});
