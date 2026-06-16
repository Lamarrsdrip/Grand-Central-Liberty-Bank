"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { secureFetch } from "@/lib/client-api";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      className="w-full text-white hover:bg-emerald-700/60 hover:text-white"
      variant="ghost"
      type="button"
      onClick={async () => {
        await secureFetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut data-icon="inline-start" />
      Log out
    </Button>
  );
}
