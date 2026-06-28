"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Headphones, Loader2, Send, X } from "lucide-react";

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
  const [minimized, setMinimized] = useState(false);
  const lastReadAt = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function scrollToBottom(instant = false) {
    bottomRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" } as ScrollIntoViewOptions);
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

  // Listen for open-support-chat event from withdrawal status page
  useEffect(() => {
    function handler() {
      setOpen(true);
      setMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  useEffect(() => {
    if (!ticketId) return;
    async function poll() {
      const msgs = await loadMessages(ticketId!);
      if (!open && lastReadAt.current) {
        const unread = msgs.filter(
          (m) => m.senderRole === "ADMIN" && m.createdAt > lastReadAt.current!
        ).length;
        setUnreadCount(unread);
      }
    }
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ticketId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !minimized) {
      if (messages.length > 0) lastReadAt.current = messages[messages.length - 1].createdAt;
      setUnreadCount(0);
      setTimeout(() => { scrollToBottom(true); inputRef.current?.focus(); }, 120);
    }
  }, [open, minimized]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && !minimized) scrollToBottom();
  }, [messages.length, open, minimized]);

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
      setTimeout(() => scrollToBottom(), 60);
    } finally {
      setSending(false);
    }
  }

  if (!signedIn) {
    return (
      <a
        href="/login?support=1"
        className="floating-support-button group"
        aria-label="Sign in to chat with support"
      >
        <span className="relative grid size-14 place-items-center rounded-full shadow-[0_8px_40px_rgba(34,197,94,0.45)] transition-all duration-300 group-hover:scale-105"
          style={{ background: "linear-gradient(135deg,#22c55e,#059669)" }}>
          <Headphones className="size-6 text-white" />
        </span>
        <span className="hidden rounded-full border border-white/10 bg-[#0d1420]/95 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur-xl sm:block">
          Live Support
        </span>
      </a>
    );
  }

  const panelVisible = open && !minimized;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[99] flex flex-col rounded-3xl overflow-hidden"
          style={{
            bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
            right: "max(1rem, env(safe-area-inset-right))",
            left: "max(1rem, env(safe-area-inset-left))",
            maxWidth: "420px",
            marginLeft: "auto",
            height: minimized ? "auto" : "min(560px, calc(100dvh - 130px))",
            background: "linear-gradient(180deg, #0a1020 0%, #080d18 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(34,197,94,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            transition: "height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0 cursor-pointer select-none"
            style={{
              background: "linear-gradient(90deg, rgba(15,22,38,0.98) 0%, rgba(10,16,28,0.98) 100%)",
              borderBottom: panelVisible ? "1px solid rgba(255,255,255,0.05)" : "none"
            }}
            onClick={() => setMinimized((m) => !m)}
          >
            <div className="size-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#22c55e22,#059669)", border: "1px solid rgba(34,197,94,0.18)" }}>
              <Building2 className="size-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white leading-none">Grand Liberty Bank Support</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-400" />
                </span>
                <p className="text-[0.65rem] font-bold text-emerald-400/70">Online · Typically reply in minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}
                className="size-7 flex items-center justify-center rounded-full transition text-white/30 hover:text-white hover:bg-white/8"
                aria-label="Minimize"
              >
                <ChevronDown className={`size-4 transition-transform duration-300 ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false); }}
                className="size-7 flex items-center justify-center rounded-full transition text-white/30 hover:text-white hover:bg-white/8"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          {panelVisible && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-5 text-emerald-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                    <div
                      className="size-16 rounded-3xl flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg,#22c55e18,#059669)", border: "1px solid rgba(34,197,94,0.2)" }}
                    >
                      <Headphones className="size-7 text-emerald-400" />
                    </div>
                    <p className="text-base font-black text-white mb-2">How can we help?</p>
                    <p className="text-xs text-white/35 leading-relaxed max-w-[220px]">
                      Send a message and a Grand Central Liberty Bank specialist will reply shortly.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 justify-center">
                      {["Withdrawal help", "Account question", "Other"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setInput(q)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.senderRole !== "ADMIN";
                    return (
                      <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
                        {!isUser && (
                          <div className="size-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-auto mb-5"
                            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.18)" }}>
                            <Building2 className="size-3.5 text-emerald-400" />
                          </div>
                        )}
                        <div style={{ maxWidth: "78%" }}>
                          {!isUser && (
                            <p className="text-[0.6rem] font-bold text-white/25 mb-1 px-1">Support Agent</p>
                          )}
                          <div
                            className="px-4 py-2.5 text-sm leading-relaxed"
                            style={isUser ? {
                              background: "linear-gradient(135deg,rgba(34,197,94,0.22),rgba(5,150,105,0.18))",
                              color: "#fff",
                              borderRadius: "18px 18px 4px 18px",
                              border: "1px solid rgba(34,197,94,0.22)",
                            } : {
                              background: "rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.85)",
                              borderRadius: "18px 18px 18px 4px",
                              border: "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            {msg.body}
                          </div>
                          <p
                            className="text-[0.58rem] text-white/20 mt-1 px-1"
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
                className="flex gap-2 px-3 py-3 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,8,18,0.6)" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  style={{
                    fontSize: "16px",
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    padding: "10px 16px",
                    color: "#fff",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "14px",
                    background: sending || !input.trim()
                      ? "rgba(255,255,255,0.05)"
                      : "linear-gradient(135deg,#22c55e,#059669)",
                    border: "none",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                    cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                    boxShadow: sending || !input.trim() ? "none" : "0 4px 16px rgba(34,197,94,0.35)",
                  }}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => { setOpen((o) => !o); setMinimized(false); }}
        className="floating-support-button group"
        aria-label={open ? "Close support chat" : "Open live support chat"}
      >
        <span
          className="relative grid size-14 place-items-center rounded-full transition-all duration-300 group-hover:scale-105"
          style={{
            background: open ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#22c55e,#059669)",
            boxShadow: open ? "none" : "0 8px 40px rgba(34,197,94,0.45), 0 2px 8px rgba(0,0,0,0.4)",
            border: open ? "1px solid rgba(255,255,255,0.15)" : "none",
          }}
        >
          {open ? (
            <X className="size-6 text-white/70" />
          ) : (
            <Headphones className="size-6 text-white" />
          )}
          {!open && unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[0.65rem] font-black text-white ring-2 ring-[#080c14] shadow-lg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {!open && (
          <span className="hidden rounded-2xl border border-white/8 bg-[#0d1420]/95 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur-xl sm:flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Support
          </span>
        )}
      </button>
    </>
  );
}
