"use client";

import { Headphones } from "lucide-react";

export function ChatMoreCard({ label, body }: { label: string; body: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-support-chat"))}
      className="card-dark block p-5 transition hover:bg-white/6 w-full text-left"
    >
      <Headphones className="size-5 text-green" />
      <p className="mt-4 text-lg font-black text-white">{label}</p>
      <p className="mt-1 text-sm text-white/45">{body}</p>
    </button>
  );
}
