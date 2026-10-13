"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button
      aria-label="Sign out"
      className={compact ? "size-11 min-h-0 rounded-2xl border-transparent p-0 text-zinc-500 hover:border-[#2e3238] hover:bg-[#24272b] hover:text-white" : undefined}
      onClick={() => signOut({ redirectTo: "/" })}
      variant={compact ? "ghost" : "secondary"}
    >
      <LogOut aria-hidden="true" className="size-4" />
      {compact ? <span className="sr-only">Sign out</span> : "Sign out"}
    </Button>
  );
}
