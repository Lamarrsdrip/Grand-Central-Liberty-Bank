export function normalizePublicChatMessage(message: { id: string; body: string; createdAt: string; senderRole: string }) {
  return { id: message.id, body: message.body, createdAt: message.createdAt, senderRole: message.senderRole };
}

type SupportSender = {
  firstName: string;
  lastName: string;
  role: string;
};

export function resolveSupportSender(
  message: { senderId: string | null; sender: SupportSender | null },
  ticketUserId: string
) {
  if (message.sender) {
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();
    return {
      senderName: senderName || (message.sender.role === "USER" ? "Customer" : "Support agent"),
      senderRole: message.sender.role === "USER" ? "USER" : "ADMIN"
    } as const;
  }

  const senderRole = message.senderId === ticketUserId ? "USER" : "ADMIN";
  return {
    senderName: senderRole === "USER" ? "Former customer" : "Former support agent",
    senderRole
  } as const;
}
