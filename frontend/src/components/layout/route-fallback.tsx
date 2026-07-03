import { AlertTriangle } from "lucide-react";

/** Generic branded skeleton shown by loading.tsx while a route's server data is fetched. */
export function RouteLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">
      <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
      <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Generic branded fallback shown by error.tsx when a route's server render throws. */
export function RouteErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-md mx-auto flex flex-col items-center text-center gap-4 py-24 px-4">
      <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <div>
        <p className="font-black text-white">Something went wrong</p>
        <p className="text-sm text-white/50 mt-1">
          This page could not load. Please try again, or contact support if the problem continues.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-emerald-400 text-[#06110a] font-black px-5 py-2.5 text-sm hover:bg-emerald-300 transition"
      >
        Try again
      </button>
    </div>
  );
}
