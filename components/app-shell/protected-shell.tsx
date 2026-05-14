"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
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
  const handleNavigate = useCallback(() => {}, []);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* removed full screen loader */}
      <Sidebar pathname={pathname} role={role} userName={userName} onNavigate={handleNavigate} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header pathname={pathname} />
        <main className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
