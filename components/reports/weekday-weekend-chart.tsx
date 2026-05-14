"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

export function WeekdayWeekendChart({
  data,
}: {
  data: Array<{ label: string; subject: number; comp: number }>;
}) {
  return (
    <div className="h-72 w-full rounded-md border border-slate-100 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={12} barCategoryGap="26%" margin={{ top: 14, right: 18, bottom: 6, left: 0 }}>
          <defs>
            <linearGradient id="weekdayWeekendSubject" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="weekdayWeekendComp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fill: "#475569", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelStyle={{ color: "#0f172a", fontWeight: 700 }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #dbeafe",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 14px 30px -20px rgba(15,23,42,0.18)",
            }}
            cursor={{ fill: "rgba(219,234,254,0.35)" }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "#475569", paddingBottom: "8px" }}
          />
          <Bar dataKey="subject" name="Subject" fill="url(#weekdayWeekendSubject)" radius={[6, 6, 2, 2]} />
          <Bar dataKey="comp" name="Comp Avg" fill="url(#weekdayWeekendComp)" radius={[6, 6, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
