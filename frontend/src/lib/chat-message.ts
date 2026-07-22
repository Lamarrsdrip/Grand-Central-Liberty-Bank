export function normalizePublicChatMessage(message: { id: string; body: string; createdAt: string; senderRole: string }) {
  return { id: message.id, body: message.body, createdAt: message.createdAt, senderRole: message.senderRole };
}
