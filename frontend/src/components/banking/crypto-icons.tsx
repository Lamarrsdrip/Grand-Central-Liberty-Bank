import { cn } from "@/lib/utils";

type CryptoIconProps = {
  symbol?: string | null;
  className?: string;
};

export function CryptoIcon({ symbol, className }: CryptoIconProps) {
  const key = (symbol ?? "").toUpperCase();
  const baseClass = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className);

  if (key === "BTC") {
    return (
      <span className={baseClass} aria-label="Bitcoin logo" role="img">
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <circle cx="32" cy="32" r="32" fill="#F7931A" />
          <path
            fill="#fff"
            d="M42.9 28.5c.6-4-2.5-6.1-6.7-7.5l1.4-5.5-3.3-.8-1.3 5.3c-.9-.2-1.8-.4-2.7-.6l1.3-5.4-3.3-.8-1.4 5.5-2.1-.5-4.6-1.1-.9 3.6s2.5.6 2.4.6c1.3.3 1.6 1.2 1.6 1.9l-1.6 6.3c.1 0 .2.1.4.1l-.4-.1-2.2 8.8c-.2.4-.6 1.1-1.5.9.1 0-2.4-.6-2.4-.6l-1.7 3.8 4.3 1.1 2.3.6-1.4 5.6 3.3.8 1.4-5.5c.9.3 1.8.5 2.7.7l-1.4 5.5 3.3.8 1.4-5.6c5.7 1.1 10 .7 11.8-4.5 1.5-4.2-.1-6.6-3.1-8.2 2.2-.5 3.8-2 4.3-5.1Zm-7.7 11.1c-1 4.2-8.1 1.9-10.4 1.3l1.9-7.5c2.3.6 9.6 1.7 8.5 6.2Zm1.1-11.1c-.9 3.8-6.8 1.9-8.8 1.4l1.7-6.8c2 .5 8.1 1.4 7.1 5.4Z"
          />
        </svg>
      </span>
    );
  }

  if (key === "ETH") {
    return (
      <span className={baseClass} aria-label="Ethereum logo" role="img">
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <circle cx="32" cy="32" r="32" fill="#627EEA" />
          <path d="M32.2 10 19 32.4l13.2-6 13.1 6L32.2 10Z" fill="#fff" fillOpacity=".92" />
          <path d="M32.2 10v16.4l13.1 6L32.2 10Z" fill="#D7E0FF" fillOpacity=".95" />
          <path d="M19 35l13.2 18.7L45.4 35l-13.2 7.8L19 35Z" fill="#fff" fillOpacity=".92" />
          <path d="M32.2 42.8v10.9L45.4 35l-13.2 7.8Z" fill="#D7E0FF" fillOpacity=".95" />
          <path d="m19 32.4 13.2 7.8 13.1-7.8-13.1-6-13.2 6Z" fill="#C4D0FF" />
        </svg>
      </span>
    );
  }

  if (key === "USDT") {
    return (
      <span className={baseClass} aria-label="Tether logo" role="img">
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <circle cx="32" cy="32" r="32" fill="#26A17B" />
          <path
            fill="#fff"
            d="M47.6 18.5H16.4v7.6h11.9v4.7c-9.7.4-17 2.3-17 4.7s7.3 4.3 17 4.7v15.3h7.4V40.2c9.7-.4 17-2.3 17-4.7s-7.3-4.3-17-4.7v-4.7h11.9v-7.6Zm-15.6 18c-10.5 0-19-1.1-19-2.5 0-1.2 6.6-2.2 15.3-2.5v4.2c1.2.1 2.5.1 3.7.1s2.5 0 3.7-.1v-4.2c8.7.3 15.3 1.3 15.3 2.5 0 1.4-8.5 2.5-19 2.5Z"
          />
        </svg>
      </span>
    );
  }

  if (key === "SOL") {
    return (
      <span className={baseClass} aria-label="Solana logo" role="img">
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="solana-a" x1="18" y1="48" x2="49" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00FFA3" />
              <stop offset=".52" stopColor="#DC1FFF" />
              <stop offset="1" stopColor="#9945FF" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="32" fill="#111827" />
          <path d="M20.6 18.4a2.4 2.4 0 0 1 1.7-.7h27.8c1.1 0 1.6 1.3.8 2.1l-5.5 5.5a2.4 2.4 0 0 1-1.7.7H15.9c-1.1 0-1.6-1.3-.8-2.1l5.5-5.5Z" fill="url(#solana-a)" />
          <path d="M20.6 38.8a2.4 2.4 0 0 1 1.7-.7h27.8c1.1 0 1.6 1.3.8 2.1l-5.5 5.5a2.4 2.4 0 0 1-1.7.7H15.9c-1.1 0-1.6-1.3-.8-2.1l5.5-5.5Z" fill="url(#solana-a)" />
          <path d="M43.4 28.6a2.4 2.4 0 0 0-1.7-.7H13.9c-1.1 0-1.6 1.3-.8 2.1l5.5 5.5a2.4 2.4 0 0 0 1.7.7h27.8c1.1 0 1.6-1.3.8-2.1l-5.5-5.5Z" fill="url(#solana-a)" />
        </svg>
      </span>
    );
  }

  return (
    <span className={cn(baseClass, "bg-white/10 text-[0.65rem] font-black text-white/70")} aria-label={`${key || "Crypto"} logo`}>
      {key.slice(0, 4) || "COIN"}
    </span>
  );
}
