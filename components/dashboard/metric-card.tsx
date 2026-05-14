import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  trend
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string; positive?: boolean };
}) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        {icon}
      </div>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</CardTitle>
        <div className="text-slate-400">
          {icon && <div className="h-5 w-5">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold tracking-tight text-slate-900">{value}</div>
        {trend ? (
          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {trend.positive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-slate-500">{trend.label}</span>
          </div>
        ) : subtitle ? (
          <p className="mt-3 text-xs font-medium text-slate-500">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
