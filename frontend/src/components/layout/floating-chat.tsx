"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, X, Send, Loader2 } from "lucide-react";

type Msg = {
  id: string;
  body: string;
  senderRole: string;
  createdAt: string;
};

function normalizeFromGet(m: {
  id: string; body: string; createdAt: string;
  sender: { role: string };
}): Msg {
  return { id: m.id, body: m.body, senderRole: m.sender.role, createdAt: m.createdAt };
}

function normalizeFromPost(m: {
  id: string; body: string; senderRole: string; createdAt: string;
}): Msg {
  return { id: m.id, body: m.body, senderRole: m.senderRole, createdAt: m.createdAt };
}

export function FloatingChat({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastReadAt = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function loadMessages(id: string) {
    const res = await fetch(`/api/support/messages?ticketId=${id}`);
    const data = await res.json();
    if (data.messages) {
      const msgs: Msg[] = data.messages.map(normalizeFromGet);
      setMessages(msgs);
      return msgs;
    }
    return [];
  }

  async function initTicket() {
    if (!signedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (data.tickets?.length > 0) {
        const ticket =
          data.tickets.find((t: { status: string }) => t.status === "OPEN" || t.status === "ACTIVE") ??
          data.tickets[0];
        setTicketId(ticket.id);
        await loadMessages(ticket.id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    initTicket();
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/restart poll whenever ticketId or open state changes
  useEffect(() => {
    if (!ticketId) return;

    async function poll() {
      const msgs = await loadMessages(ticketId!);
      // Only count unread when panel is closed
      if (!open && lastReadAt.current) {
        const unread = msgs.filter(
          (m) => m.senderRole === "ADMIN" && m.createdAt > lastReadAt.current!
        ).length;
        setUnreadCount(unread);
      }
    }

    pollRef.current = setInterval(poll, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ticketId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // When panel opens: mark all read, scroll to bottom
  useEffect(() => {
    if (open) {
      if (messages.length > 0) lastReadAt.current = messages[messages.length - 1].createdAt;
      setUnreadCount(0);
      setTimeout(scrollToBottom, 100);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll when new messages arrive while open
  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages.length, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");

    try {
      if (!ticketId) {
        const res = await fetch("/api/support/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "Live Support Chat", body }),
        });
        const data = await res.json();
        if (data.ticket) {
          setTicketId(data.ticket.id);
          setMessages(data.ticket.messages.map(normalizeFromPost));
        }
      } else {
        const res = await fetch("/api/support/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, body }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, normalizeFromPost(data.message)]);
        }
      }
      setTimeout(scrollToBottom, 50);
    } finally {
      setSending(false);
    }
  }

  // Unsigned-in: link to login
  if (!signedIn) {
    return (
      <a href="/login?support=1" className="floating-support-button group" aria-label="Sign in to chat with support">
        <span className="relative grid size-12 place-items-center rounded-full bg-emerald-400 text-[#06110a] shadow-[0_18px_50px_rgba(34,197,94,0.38)] transition group-hover:scale-105 group-hover:bg-emerald-300">
          <Headphones className="size-5" />
        </span>
        <span className="hidden rounded-full border border-white/10 bg-[#111827]/90 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur-xl sm:block">
          Live chat
        </span>
      </a>
    );
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[99] flex flex-col rounded-2xl overflow-hidden"
          style={{
            bottom: "calc(5rem + env(safe-area-inset-bottom))",
            right: "max(0.75rem, env(safe-area-inset-right))",
            left: "max(0.75rem, env(safe-area-inset-left))",
            maxWidth: "400px",
            marginLeft: "auto",
            height: "min(500px, calc(100dvh - 120px))",
            background: "#0d1420",
            border: "1px solid rgba(34,197,94,0.2)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(34,197,94,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "rgba(10,16,28,0.98)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <Headphones className="size-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-none mb-0.5">Support Chat</p>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[0.6rem] font-bold text-emerald-400/60">Online — typically reply in minutes</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="size-7 flex items-center justify-center rounded-full transition text-white/30 hover:text-white hover:bg-white/8"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="size-5 text-emerald-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Headphones className="size-6 text-emerald-400" />
                </div>
                <p className="text-sm font-black text-white mb-1">How can we help?</p>
                <p className="text-xs text-white/35 leading-relaxed">
                  Send a message and a Grand Central Liberty Bank specialist will reply shortly.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.senderRole !== "ADMIN";
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div style={{ maxWidth: "82%" }}>
                      {!isUser && (
                        <p className="text-[0.58rem] font-bold text-white/25 mb-0.5 px-1">
                          Support Agent
                        </p>
                      )}
                      <div
                        className="px-3.5 py-2 text-sm leading-relaxed"
                        style={isUser ? {
                          background: "rgba(34,197,94,0.18)",
                          color: "#fff",
                          borderRadius: "18px 18px 4px 18px",
                          border: "1px solid rgba(34,197,94,0.25)",
                        } : {
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.82)",
                          borderRadius: "18px 18px 18px 4px",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        {msg.body}
                      </div>
                      <p
                        className="text-[0.58rem] text-white/20 mt-0.5 px-1"
                        style={{ textAlign: isUser ? "right" : "left" }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              style={{
                fontSize: "16px",
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "12px",
                padding: "8px 14px",
                color: "#fff",
                outline: "none",
              }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "rgba(34,197,94,0.18)",
                border: "1px solid rgba(34,197,94,0.28)",
                color: "#4ade80",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: (!input.trim() || sending) ? 0.35 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="floating-support-button group"
        aria-label={open ? "Close support chat" : "Open live support chat"}
      >
        <span className="relative grid size-12 place-items-center rounded-full bg-emerald-400 text-[#06110a] shadow-[0_18px_50px_rgba(34,197,94,0.38)] transition group-hover:scale-105 group-hover:bg-emerald-300">
          {open ? <X className="size-5" /> : <Headphones className="size-5" />}
          {!open && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[0.65rem] font-black text-white ring-2 ring-[#080c14]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {!open && (
          <span className="hidden rounded-full border border-white/10 bg-[#111827]/90 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur-xl sm:block">
            Live chat
          </span>
        )}
      </button>
    </>
  );
}
