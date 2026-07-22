import { createHash } from "node:crypto";

export function deterministicChatObjectId(senderId: string, ticketId: string, clientMessageId: string) {
  return createHash("sha256")
    .update(`${senderId}:${ticketId}:${clientMessageId}`)
    .digest("hex")
    .slice(0, 24);
}

export function parseIncrementalChatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error("after must be a valid ISO timestamp."), { status: 400 });
  }
  return parsed;
}
