"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

import { Header } from "@/components/app-shell/header";
import { Sidebar } from "@/components/app-shell/sidebar";
import { PageLoader } from "@/components/ui/page-loader";

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
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastNavigationTime, setLastNavigationTime] = useState(0);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Auto-clear loading state after 5 seconds as fallback
  useEffect(() => {
    if (isNavigating) {
      const timeout = setTimeout(() => {
        setIsNavigating(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isNavigating]);

  const handleNavigate = useCallback(() => {
    const now = Date.now();
    // Prevent rapid successive clicks (within 500ms)
    if (now - lastNavigationTime < 500) {
      return;
    }
    setLastNavigationTime(now);
    setIsNavigating(true);
  }, [lastNavigationTime]);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* removed full screen loader */}
      <Sidebar pathname={pathname} role={role} userName={userName} onNavigate={handleNavigate} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header pathname={pathname} />
        <main className="flex-1 overflow-y-auto p-6 relative">
          {isNavigating && <PageLoader />}
          {children}
        </main>
      </div>
    </div>
  );
}
