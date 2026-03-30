import Link from "next/link";
import { Building2, ChartLine, FileText, LayoutGrid, Settings, SlidersHorizontal, Upload } from "lucide-react";

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

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden w-64 border-r bg-white px-4 py-6 lg:block">
      <Link href="/dashboard" className="mb-8 block text-lg font-semibold">
        Hotel Demo Intelligence
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.label as keyof typeof iconMap];
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
