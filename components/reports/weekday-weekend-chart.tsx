"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/utils";

export function WeekdayWeekendChart({
  data,
}: {
  data: Array<{ label: string; subject: number; comp: number }>;
}) {
  return (
    <div className="h-72 w-full rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-100/60 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          barCategoryGap="28%"
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <defs>
            <linearGradient id="weekdayWeekendSubject" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="weekdayWeekendComp" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#bfdbfe" strokeDasharray="4 5" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value) => formatCurrency(Number(value))}
            tick={{ fill: "#1e3a8a", fontSize: 12 }}
            axisLine={{ stroke: "#93c5fd" }}
            tickLine={{ stroke: "#93c5fd" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fill: "#1e40af", fontSize: 13, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid #bfdbfe",
              backgroundColor: "#ffffff",
            }}
            itemStyle={{ color: "#1e3a8a" }}
            labelStyle={{ color: "#1e40af", fontWeight: 600 }}
            cursor={{ fill: "#dbeafe" }}
          />
          <Legend />
          <Bar
            dataKey="subject"
            name="Subject"
            fill="url(#weekdayWeekendSubject)"
            radius={[0, 10, 10, 0]}
            barSize={16}
            activeBar={{ fill: "url(#weekdayWeekendSubject)", stroke: "#1d4ed8", strokeWidth: 1 }}
          />
          <Bar
            dataKey="comp"
            name="Comp Avg"
            fill="url(#weekdayWeekendComp)"
            radius={[0, 10, 10, 0]}
            barSize={16}
            activeBar={{ fill: "url(#weekdayWeekendComp)", stroke: "#60a5fa", strokeWidth: 1 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
