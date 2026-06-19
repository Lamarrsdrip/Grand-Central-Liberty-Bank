"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Info, AlertTriangle, DollarSign, Shield, Mail } from "lucide-react";
import { secureFetch } from "@/lib/client-api";
import { formatDate } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: Date | string | null;
  createdAt: Date | string;
};

const TYPE_ICON: Record<string, React.ElementType> = {
  KYC_APPROVED:       Shield,
  KYC_REJECTED:       AlertTriangle,
  KYC_INFO_REQUESTED: Info,
  TRANSFER_SUBMITTED: DollarSign,
  CARD_APPROVED:      Check,
  CARD_REJECTED:      AlertTriangle,
  ACCOUNT_FROZEN:     AlertTriangle,
  ACCOUNT_UNFROZEN:   Check,
  PASSWORD_CHANGED:   Shield,
  LOGIN_ALERT:        Shield,
  NEW_MESSAGE:        Mail,
  SYSTEM:             Bell,
  EMAIL_VERIFICATION: Mail,
};

const TYPE_COLOR: Record<string, string> = {
  KYC_APPROVED:       "bg-green/15 text-green",
  KYC_REJECTED:       "bg-red-500/15 text-red-400",
  KYC_INFO_REQUESTED: "bg-amber-500/15 text-amber-400",
  TRANSFER_SUBMITTED: "bg-blue-500/15 text-blue-400",
  CARD_APPROVED:      "bg-green/15 text-green",
  CARD_REJECTED:      "bg-red-500/15 text-red-400",
  ACCOUNT_FROZEN:     "bg-red-500/15 text-red-400",
  ACCOUNT_UNFROZEN:   "bg-green/15 text-green",
  PASSWORD_CHANGED:   "bg-orange-500/15 text-orange-400",
  LOGIN_ALERT:        "bg-orange-500/15 text-orange-400",
  NEW_MESSAGE:        "bg-purple-500/15 text-purple-400",
  SYSTEM:             "bg-white/8 text-white/40",
  EMAIL_VERIFICATION: "bg-blue-500/15 text-blue-400",
};

export function NotificationsClient({
  notifications: initial,
  showMarkAll = false,
}: {
  notifications: Notification[];
  showMarkAll?: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [markingAll, setMarkingAll] = useState(false);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await secureFetch("/api/notifications/read-all", { method: "POST" });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    } catch { /* non-fatal */ }
    setMarkingAll(false);
  }

  async function markOneRead(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    try {
      await secureFetch("/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
    } catch { /* non-fatal */ }
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      {showMarkAll && unread > 0 && (
        <div className="flex justify-end">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs font-bold text-green hover:text-green-dim transition disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" />
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? Bell;
          const colorClass = TYPE_COLOR[n.type] ?? "bg-white/8 text-white/40";
          const isUnread = !n.readAt;

          return (
            <button
              key={n.id}
              onClick={() => isUnread && markOneRead(n.id)}
              className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition ${
                isUnread
                  ? "card-dark border-green/10 hover:border-green/20"
                  : "bg-white/3 border-white/5 opacity-60 hover:opacity-80"
              }`}
            >
              <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold truncate ${isUnread ? "text-white" : "text-white/60"}`}>
                    {n.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isUnread && <span className="size-1.5 rounded-full bg-green shrink-0" />}
                    <span className="text-[0.6rem] text-white/25 whitespace-nowrap">
                      {formatDate(new Date(n.createdAt))}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
