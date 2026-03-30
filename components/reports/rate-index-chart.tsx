"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RateIndexChart({ data }: { data: Array<{ date: string; rateIndex: number | null }> }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(0, 30)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0.6, 1.4]} />
          <Tooltip formatter={(value) => Number(value).toFixed(2)} />
          <Line type="monotone" dataKey="rateIndex" name="Rate Index" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
