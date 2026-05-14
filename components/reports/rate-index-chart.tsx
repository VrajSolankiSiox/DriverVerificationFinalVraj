"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RateIndexChart({ data }: { data: Array<{ date: string; rateIndex: number | null }> }) {
  const chartData = data;
  const chartWidth = Math.max(720, chartData.length * 52);

  return (
    <div className="rounded-[24px] border border-indigo-100 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(238,242,255,0.92))] p-3">
      <div className="h-72 w-full overflow-x-auto overflow-y-hidden">
        <div className="h-full" style={{ width: chartWidth }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 16, right: 16, bottom: 6, left: 0 }}>
          <defs>
            <linearGradient id="rateIndexFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#dbe4fb" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={10}
            angle={-28}
            textAnchor="end"
            height={58}
          />
          <YAxis
            domain={[0.6, 1.4]}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => Number(value).toFixed(2)}
            labelStyle={{ color: "#0f172a", fontWeight: 700 }}
            contentStyle={{
              borderRadius: "18px",
              border: "1px solid #c7d2fe",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 20px 46px -28px rgba(67,56,202,0.35)",
            }}
            cursor={{ stroke: "#c7d2fe", strokeWidth: 1.5, strokeDasharray: "4 4" }}
          />
          <ReferenceLine y={1} stroke="#0f766e" strokeDasharray="5 5" strokeWidth={1.5} />
          <Area type="monotone" dataKey="rateIndex" stroke="#4f46e5" fill="url(#rateIndexFill)" strokeWidth={3} />
        </ComposedChart>
      </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
