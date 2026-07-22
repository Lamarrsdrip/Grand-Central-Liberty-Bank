import { describe, expect, it } from "vitest";
import { deterministicChatObjectId, parseIncrementalChatDate } from "@/lib/chat";
import { normalizePublicChatMessage, resolveSupportSender } from "@/lib/chat-message";

describe("chat request integrity", () => {
  it("deduplicates a repeated client submission within one conversation", () => {
    const first = deterministicChatObjectId("user-a", "ticket-a", "4b668b12-c7a4-4a1d-a7ad-d08e855aa433");
    const retry = deterministicChatObjectId("user-a", "ticket-a", "4b668b12-c7a4-4a1d-a7ad-d08e855aa433");
    expect(first).toBe(retry);
    expect(first).toMatch(/^[a-f0-9]{24}$/);
  });

  it("does not collide when a client id is reused by another user or ticket", () => {
    const clientId = "4b668b12-c7a4-4a1d-a7ad-d08e855aa433";
    const ids = new Set([
      deterministicChatObjectId("user-a", "ticket-a", clientId),
      deterministicChatObjectId("user-a", "ticket-b", clientId),
      deterministicChatObjectId("user-b", "ticket-a", clientId)
    ]);
    expect(ids.size).toBe(3);
  });

  it("accepts valid incremental timestamps and rejects invalid cache cursors", () => {
    expect(parseIncrementalChatDate("2026-07-22T09:45:00.000Z")?.toISOString()).toBe("2026-07-22T09:45:00.000Z");
    expect(() => parseIncrementalChatDate("not-a-date")).toThrow(/valid ISO timestamp/i);
  });

  it("renders the flattened safe API shape used by both customer and admin messages", () => {
    expect(normalizePublicChatMessage({ id: "message-1", body: "Admin reply", createdAt: "2026-07-22T09:46:00.000Z", senderRole: "ADMIN" })).toEqual({
      id: "message-1", body: "Admin reply", createdAt: "2026-07-22T09:46:00.000Z", senderRole: "ADMIN"
    });
  });

  it("preserves legacy messages whose customer relation no longer resolves", () => {
    expect(resolveSupportSender({ senderId: "customer-1", sender: null }, "customer-1")).toEqual({
      senderName: "Former customer",
      senderRole: "USER"
    });
  });

  it("preserves legacy messages whose support-agent relation no longer resolves", () => {
    expect(resolveSupportSender({ senderId: "former-admin", sender: null }, "customer-1")).toEqual({
      senderName: "Former support agent",
      senderRole: "ADMIN"
    });
  });
});
