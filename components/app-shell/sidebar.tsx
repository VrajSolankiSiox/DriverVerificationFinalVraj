"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Building2,
  ChartLine,
  FileText,
  LayoutGrid,
  Settings,
  SlidersHorizontal,
  Upload,
  BarChart3,
  Presentation,
  LogOut,
  ChevronUp,
  UserCircle2,
} from "lucide-react";

import { navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/signout-button";
import Image from "next/image";

const iconMap = {
  Dashboard: LayoutGrid,
  Hotels: Building2,
  CompSets: SlidersHorizontal,
  Uploads: Upload,
  Reports: ChartLine,
  Demo: Presentation,
  Templates: FileText,
  Settings: Settings,
};

export function Sidebar({
  pathname,
  role,
  userName,
  onNavigate,
}: {
  pathname: string;
  role: string;
  userName: string;
  onNavigate: () => void;
}) {
  const [optimisticPath, setOptimisticPath] = useState(pathname);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLinkClick = (href: string) => {
    setOptimisticPath(href);
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <nav className="relative h-screen w-64 bg-white border-r border-slate-200 shadow-sm lg:block overflow-hidden">
      {/* Header/Logo Section */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white">
        <Link
          href="/dashboard"
          className="block group"
          onClick={() => {
            handleLinkClick("/dashboard");
            onNavigate();
          }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Logo / Identity Block */}
            <div className="">
              {/* Product Name */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-primary tracking-tight  transition-colors duration-200 group-hover:text-primary">
                  Hotel Demo
                </h1>

                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-6 bg-slate-200" />

                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Intelligence
                  </p>

                  <div className="h-px w-6 bg-slate-200" />
                </div>
              </div>

              {/* Brand Attribution */}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Section — padded at bottom so user footer never overlaps */}
      <div
        className="px-3 py-4 space-y-1 overflow-y-auto"
        style={{ paddingBottom: "90px" }}
      >
        {navItems.map((item) => {
          const Icon = iconMap[item.label as keyof typeof iconMap];
          const active = optimisticPath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                handleLinkClick(item.href);
                onNavigate();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-700",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile Footer — absolutely pinned to the very bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-3"
        ref={userMenuRef}
      >
        {/* Logout popup — floats above independently, doesn't affect footer layout */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {userName}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {role.toLowerCase() == "admin" && role.toLowerCase()}
              </p>
            </div>
            <div className="p-1.5">
              <SignOutButton
                variant="ghost"
                className="w-full justify-start gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-sm"
                label="Log out"
                icon={<LogOut className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
        <button
          onClick={() => setUserMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="truncate font-medium text-slate-800">{userName}</p>
            <p className="text-xs text-slate-500 capitalize">
              {role.toLowerCase() == "admin" && role.toLowerCase()}
            </p>
          </div>
          <ChevronUp
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              userMenuOpen ? "rotate-180" : "",
            )}
          />
        </button>
      </div>
    </nav>
  );
}
