"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function DashboardActivityChart({ 
  data,
  currentFilter
}: { 
  data: Array<{ date: string; uploads: number; reports: number; demos: number }>,
  currentFilter: string
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("activityFilter", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Card className="rounded-2xl border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100/50 pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-slate-800">Activity Overview</CardTitle>
        <select 
          value={currentFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="w-full">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#64748b", fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#64748b", fontSize: 12 }} 
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              />
              <Bar dataKey="uploads" name="Uploads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reports" name="Reports" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demos" name="Demos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
