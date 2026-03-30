"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/app-shell/header";
import { Sidebar } from "@/components/app-shell/sidebar";

export function ProtectedShell({
  userName,
  role,
  children,
}: {
  userName: string;
  role: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar pathname={pathname} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header userName={userName} role={role} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
