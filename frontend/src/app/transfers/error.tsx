"use client";

import { useEffect } from "react";
import { RouteErrorFallback } from "@/components/layout/route-fallback";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return <RouteErrorFallback reset={reset} />;
}
