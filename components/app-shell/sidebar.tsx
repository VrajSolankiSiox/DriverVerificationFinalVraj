"use client";
import Link from "next/link";
import {
  Building2,
  ChartLine,
  FileText,
  LayoutGrid,
  Settings,
  SlidersHorizontal,
  Upload,
  BarChart3,
} from "lucide-react";

import { navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: LayoutGrid,
  Hotels: Building2,
  CompSets: SlidersHorizontal,
  Uploads: Upload,
  Reports: ChartLine,
  Templates: FileText,
  Settings: Settings,
};

export function Sidebar({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: string;
  onNavigate?: () => void;
}) {
  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => {
    if (item.href === "/settings" && role !== "ADMIN") {
      return false;
    }
    return true;
  });

  return (
    <nav className="sticky top-0 h-screen w-64 bg-white border-r border-slate-200 shadow-sm lg:block overflow-y-auto">
      {/* Header/Logo Section */}
      <div className="px-4 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <Link href="/dashboard" className="block group" onClick={onNavigate}>
          <div className="flex flex-col items-center text-center space-y-2">
            {/* Icon */}
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>

            {/* Brand Text */}
            <div className="space-y-0.5">
              <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors leading-tight">
                Hotel Demo
              </div>
              <div className="text-sm font-medium text-slate-600 group-hover:text-slate-700 transition-colors">
                Intelligence
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Section */}
      <div className="px-3 py-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = iconMap[item.label as keyof typeof iconMap];
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

      {/* Footer spacing */}
      <div className="flex-1" />
    </nav>
  );
}
