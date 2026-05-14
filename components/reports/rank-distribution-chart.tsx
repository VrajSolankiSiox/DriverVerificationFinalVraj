"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const barColors = ["#1e3a8a", "#2563eb", "#60a5fa", "#cbd5e1"];

export function RankDistributionChart({
  distribution,
}: {
  distribution: { lowest: number; middle: number; highest: number; missing: number };
}) {
  const data = [
    { label: "Lowest", value: distribution.lowest },
    { label: "Middle", value: distribution.middle },
    { label: "Highest", value: distribution.highest },
    { label: "Missing", value: distribution.missing },
  ];

  return (
    <div className="h-72 w-full rounded-md border border-slate-100 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#475569", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            formatter={(value) => [value, "Observed Nights"]}
            labelStyle={{ color: "#0f172a", fontWeight: 700 }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 14px 30px -20px rgba(15,23,42,0.18)",
            }}
            cursor={{ fill: "rgba(226,232,240,0.3)" }}
          />
          <Bar dataKey="value" radius={[6, 6, 2, 2]}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={barColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
