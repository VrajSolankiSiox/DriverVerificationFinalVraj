"use client";

import { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function SignOutButton({
  variant,
  className,
  label,
  icon,
}: {
  variant?: "default" | "ghost";
  className?: string;
  label?: string;
  icon?: ReactNode;
} = {}) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        variant === "ghost"
          ? "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          : "bg-red-600 py-1 px-2 text-white rounded-md hover:bg-white hover:text-black border transition",
        className
      )}
    >
      {icon}
      {label ?? "Sign out"}
    </button>
  );
}
