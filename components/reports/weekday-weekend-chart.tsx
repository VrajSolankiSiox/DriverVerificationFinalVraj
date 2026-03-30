"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/utils";

export function WeekdayWeekendChart({
  data,
}: {
  data: Array<{ label: string; subject: number; comp: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="subject" name="Subject" fill="#2563eb" />
          <Bar dataKey="comp" name="Comp Avg" fill="#0f172a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
