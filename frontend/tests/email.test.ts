import { beforeEach, describe, expect, it, vi } from "vitest";

type Delivery = {
  id: string;
  eventType: string;
  idempotencyKey: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mocks = vi.hoisted(() => ({
  deliveries: new Map<string, Delivery>(),
  sendEmail: vi.fn(),
  sequence: 0
}));

vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/logger", () => ({ log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/db", () => ({
  prisma: {
    emailDelivery: {
      upsert: async ({ where, create }: { where: { idempotencyKey: string }; create: Omit<Delivery, "id" | "status" | "provider" | "providerMessageId" | "attemptCount" | "lastError" | "nextAttemptAt" | "sentAt" | "createdAt" | "updatedAt"> }) => {
        const existing = [...mocks.deliveries.values()].find((entry) => entry.idempotencyKey === where.idempotencyKey);
        if (existing) return existing;
        const now = new Date();
        const delivery: Delivery = { ...create, id: `delivery-${++mocks.sequence}`, status: "PENDING", provider: null, providerMessageId: null, attemptCount: 0, lastError: null, nextAttemptAt: null, sentAt: null, createdAt: now, updatedAt: now };
        mocks.deliveries.set(delivery.id, delivery);
        return delivery;
      },
      updateMany: async ({ where, data }: { where: { id?: string; status?: unknown; updatedAt?: unknown }; data: Omit<Partial<Delivery>, "attemptCount"> & { attemptCount?: number | { increment: number } } }) => {
        let count = 0;
        for (const delivery of mocks.deliveries.values()) {
          if (where.id && delivery.id !== where.id) continue;
          if (where.id && !["PENDING", "FAILED"].includes(delivery.status)) continue;
          const increment = typeof data.attemptCount === "object" && data.attemptCount ? data.attemptCount.increment : 0;
          Object.assign(delivery, data, { attemptCount: delivery.attemptCount + increment, updatedAt: new Date() });
          count += 1;
        }
        return { count };
      },
      findUnique: async ({ where }: { where: { id: string } }) => mocks.deliveries.get(where.id) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const delivery = mocks.deliveries.get(where.id);
        if (!delivery) throw new Error("missing delivery");
        return delivery;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Delivery> }) => {
        const delivery = mocks.deliveries.get(where.id);
        if (!delivery) throw new Error("missing delivery");
        Object.assign(delivery, data, { updatedAt: new Date() });
        return delivery;
      },
      findMany: async () => [...mocks.deliveries.values()]
    }
  }
}));

import {
  loginEmailEvent,
  maskSensitiveEmailText,
  renderTransactionalEmail,
  sendTransactionalEmail,
  transferStatusEmailEvent
} from "@/lib/transactional-email";

beforeEach(() => {
  mocks.deliveries.clear();
  mocks.sequence = 0;
  mocks.sendEmail.mockReset();
});

describe("transactional email", () => {
  it("selects the correct login and transfer status events", () => {
    expect(loginEmailEvent(true)).toBe("LOGIN_SUCCESS");
    expect(loginEmailEvent(false)).toBe("LOGIN_NEW_DEVICE");
    expect(transferStatusEmailEvent("APPROVED")).toBe("BANK_TRANSFER_APPROVED");
    expect(transferStatusEmailEvent("REJECTED")).toBe("BANK_TRANSFER_DECLINED");
  });

  it("escapes customer content and masks card-like numbers in HTML and text", () => {
    const rendered = renderTransactionalEmail("SUPPORT_ADMIN_REPLY", {
      customerName: "<script>Ada</script>",
      messagePreview: "Card 4111 1111 1111 1111 needs help",
      maskedAccount: "•••• 4321",
      timestamp: "2026-07-22T09:45:00.000Z"
    });
    expect(rendered.html).not.toContain("<script>Ada</script>");
    expect(rendered.html).toContain("&lt;script&gt;Ada&lt;/script&gt;");
    expect(rendered.html).not.toContain("4111 1111 1111 1111");
    expect(rendered.text).toContain("•••• 1111");
    expect(maskSensitiveEmailText("4111111111111111")).toBe("•••• 1111");
  });

  it("records a clear failure when no provider accepts the request", async () => {
    mocks.sendEmail.mockResolvedValue({ skipped: true, provider: "smtp", message: "SMTP credentials are not configured." });
    const delivery = await sendTransactionalEmail({
      event: "LOGIN_SUCCESS",
      to: "customer@example.test",
      idempotencyKey: "login:session-1",
      data: { customerName: "Ada" }
    });
    expect(delivery?.status).toBe("FAILED");
    expect(delivery?.lastError).toMatch(/not configured/i);
    expect(delivery?.attemptCount).toBe(1);
  });

  it("does not send a successful idempotent event twice", async () => {
    mocks.sendEmail.mockResolvedValue({ skipped: false, provider: "resend", messageId: "provider-1" });
    const input = {
      event: "BANK_TRANSFER_CREATED" as const,
      to: "customer@example.test",
      idempotencyKey: "transfer-created:1",
      data: { customerName: "Ada", maskedAccount: "•••• 1234" }
    };
    const first = await sendTransactionalEmail(input);
    const retry = await sendTransactionalEmail(input);
    expect(first?.status).toBe("SENT");
    expect(retry?.status).toBe("SENT");
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });
});
