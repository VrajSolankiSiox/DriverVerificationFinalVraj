"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type OtaRatingPoint = {
  label: string;
  rating: number;
};

export function OtaRatingComparisonChart({ data }: { data: OtaRatingPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis domain={[0, 10]} />
          <Tooltip formatter={(value) => Number(value).toFixed(2)} />
          <Bar dataKey="rating" radius={[8, 8, 0, 0]} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
