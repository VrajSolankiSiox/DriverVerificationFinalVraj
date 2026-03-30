"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
