import Link from "next/link";
import { Headphones } from "lucide-react";

export function FloatingSupportButton({
  signedIn,
  unreadCount
}: {
  signedIn: boolean;
  unreadCount: number;
}) {
  const href = signedIn ? "/support" : "/login?support=1";

  return (
    <Link
      href={href}
      className="floating-support-button group"
      aria-label={signedIn ? "Open live support chat" : "Sign in to contact live support"}
    >
      <span className="relative grid size-12 place-items-center rounded-full bg-emerald-400 text-[#06110a] shadow-[0_18px_50px_rgba(34,197,94,0.38)] transition group-hover:scale-105 group-hover:bg-emerald-300">
        <Headphones className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[0.65rem] font-black text-white ring-2 ring-[#080c14]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </span>
      <span className="hidden rounded-full border border-white/10 bg-[#111827]/90 px-4 py-2 text-xs font-black text-white shadow-2xl backdrop-blur-xl sm:block">
        Live chat
      </span>
    </Link>
  );
}
