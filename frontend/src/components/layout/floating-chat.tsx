"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, MessageCircle, Minimize2, Send, X } from "lucide-react";

type Msg = {
  id: string;
  body: string;
  senderRole: string;
  createdAt: string;
};

function normalizeGet(m: { id: string; body: string; createdAt: string; sender: { role: string } }): Msg {
  return { id: m.id, body: m.body, senderRole: m.sender.role, createdAt: m.createdAt };
}
function normalizePost(m: { id: string; body: string; senderRole: string; createdAt: string }): Msg {
  return { id: m.id, body: m.body, senderRole: m.senderRole, createdAt: m.createdAt };
}

export function FloatingChat({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const lastSeenAt = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  async function loadMessages(id: string): Promise<Msg[]> {
    try {
      const res = await fetch(`/api/support/messages?ticketId=${id}`);
      const data = await res.json();
      if (data.messages) {
        const msgs: Msg[] = data.messages.map(normalizeGet);
        setMessages(msgs);
        return msgs;
      }
    } catch { /* ignore */ }
    return [];
  }

  async function init() {
    if (!signedIn) return;
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (data.tickets?.length > 0) {
        const t = data.tickets.find((t: { status: string }) => t.status === "OPEN" || t.status === "ACTIVE") ?? data.tickets[0];
        setTicketId(t.id);
        const msgs = await loadMessages(t.id);
        if (msgs.length) lastSeenAt.current = msgs[msgs.length - 1].createdAt;
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { init(); }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ticketId) return;
    pollRef.current = setInterval(async () => {
      const msgs = await loadMessages(ticketId);
      if (!open && lastSeenAt.current) {
        const newAdmin = msgs.filter(m => m.senderRole === "ADMIN" && m.createdAt > lastSeenAt.current!).length;
        if (newAdmin > 0) setUnread(u => u + newAdmin);
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [ticketId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      setUnread(0);
      if (messages.length) lastSeenAt.current = messages[messages.length - 1].createdAt;
      setTimeout(() => { scrollBottom(); inputRef.current?.focus(); }, 120);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) scrollBottom(); }, [messages.length, open]);

  // Allow withdrawal status page "Contact Support" button to open this widget
  useEffect(() => {
    const handler = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 200); };
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  async function send(e: React.FormEvent) {
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
          const msgs: Msg[] = data.ticket.messages.map(normalizePost);
          setMessages(msgs);
          if (msgs.length) lastSeenAt.current = msgs[msgs.length - 1].createdAt;
        }
      } else {
        const res = await fetch("/api/support/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, body }),
        });
        const data = await res.json();
        if (data.message) {
          const msg = normalizePost(data.message);
          setMessages(prev => [...prev, msg]);
          lastSeenAt.current = msg.createdAt;
        }
      }
      setTimeout(scrollBottom, 60);
    } finally {
      setSending(false);
    }
  }

  // Unauthenticated: simple link to login
  if (!signedIn) {
    return (
      <a
        href="/login?support=1"
        aria-label="Sign in to open live chat"
        style={{
          position: "fixed", bottom: "1.25rem", right: "1.25rem", zIndex: 9999,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg,#22c55e,#059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 30px rgba(34,197,94,0.45), 0 2px 8px rgba(0,0,0,0.4)",
          textDecoration: "none", transition: "transform 0.2s",
        }}
      >
        <MessageCircle size={22} color="white" />
      </a>
    );
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          right: "12px",
          left: "12px",
          maxWidth: "380px",
          marginLeft: "auto",
          height: "min(500px, calc(100dvh - 110px))",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#080d1a",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(34,197,94,0.05)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "13px 14px", flexShrink: 0,
            background: "rgba(6,10,22,0.98)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0,
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={16} color="#4ade80" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.83rem", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                Grand Liberty Bank Support
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                  background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                }} />
                <span style={{ fontSize: "0.65rem", color: "rgba(74,222,128,0.8)", fontWeight: 700 }}>
                  Online · Replies in minutes
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              width: 28, height: 28, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }} aria-label="Minimize">
              <Minimize2 size={13} />
            </button>
            <button onClick={() => setOpen(false)} style={{
              width: 28, height: 28, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }} aria-label="Close">
              <X size={13} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px 4px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: "2px solid rgba(34,197,94,0.25)", borderTopColor: "#22c55e",
                  animation: "gclb-spin 0.8s linear infinite",
                }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                flex: 1, textAlign: "center", padding: "20px 16px",
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 16,
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                }}>
                  <MessageCircle size={22} color="#4ade80" />
                </div>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff", marginBottom: 5 }}>
                  Hello! How can we help?
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.55 }}>
                  Send a message and a specialist will reply shortly.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, justifyContent: "center" }}>
                  {["Withdrawal help", "Account question", "Other"].map(q => (
                    <button key={q} onClick={() => setInput(q)} style={{
                      padding: "5px 12px", borderRadius: 99, cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)",
                      color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", fontWeight: 600,
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => {
                const isUser = msg.senderRole !== "ADMIN";
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "80%" }}>
                      {!isUser && (
                        <div style={{ fontSize: "0.6rem", color: "#4ade80", fontWeight: 700, marginBottom: 3, paddingLeft: 2 }}>
                          Support
                        </div>
                      )}
                      <div style={{
                        padding: "8px 13px", fontSize: "0.83rem", lineHeight: 1.45, color: "#fff",
                        background: isUser
                          ? "linear-gradient(135deg,rgba(34,197,94,0.22),rgba(5,150,105,0.18))"
                          : "rgba(255,255,255,0.07)",
                        borderRadius: isUser ? "15px 15px 4px 15px" : "15px 15px 15px 4px",
                        border: isUser ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(255,255,255,0.07)",
                      }}>
                        {msg.body}
                      </div>
                      <div style={{
                        fontSize: "0.58rem", color: "rgba(255,255,255,0.2)",
                        marginTop: 2, textAlign: isUser ? "right" : "left",
                        paddingLeft: 2, paddingRight: 2,
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} style={{
            display: "flex", gap: 8, padding: "10px 11px", flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,7,16,0.5)",
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
              style={{
                flex: 1, fontSize: "16px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 11, padding: "9px 13px", color: "#fff", outline: "none",
              }}
            />
            <button type="submit" disabled={sending || !input.trim()} style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0, border: "none",
              background: sending || !input.trim()
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg,#22c55e,#059669)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              boxShadow: sending || !input.trim() ? "none" : "0 4px 12px rgba(34,197,94,0.4)",
              transition: "all 0.18s",
            }}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger button — fixed bottom-right like Setron */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close support chat" : "Open live support chat"}
        style={{
          position: "fixed",
          bottom: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: open
            ? "rgba(255,255,255,0.08)"
            : "linear-gradient(135deg,#22c55e,#059669)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: open
            ? "0 2px 12px rgba(0,0,0,0.3)"
            : "0 8px 30px rgba(34,197,94,0.45), 0 2px 8px rgba(0,0,0,0.4)",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {open
          ? <X size={22} color="rgba(255,255,255,0.7)" />
          : <MessageCircle size={22} color="white" />
        }
        {!open && unread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            minWidth: 19, height: 19, borderRadius: 99,
            background: "#ef4444", color: "#fff", fontSize: "0.62rem", fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "2px solid #080d1a",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <style>{`@keyframes gclb-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
