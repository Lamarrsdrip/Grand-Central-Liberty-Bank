"use client";

import { Headphones } from "lucide-react";

export function LiveChatNavButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-support-chat"))}
      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/8 transition-all group text-left"
    >
      <Headphones className="size-4 shrink-0 group-hover:text-green transition-colors" />
      {label}
    </button>
  );
}
