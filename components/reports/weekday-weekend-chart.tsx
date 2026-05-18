"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  data: Array<{
    label: string;
    subject: number;
    comp: number;
    weekKey?: string;
    weekLabel?: string;
  }>;
}) {
  const weekOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data) {
      if (row.weekKey && row.weekLabel && !map.has(row.weekKey)) {
        map.set(row.weekKey, row.weekLabel);
      }
    }
    return [...map.entries()].map(([key, label]) => ({ key, label }));
  }, [data]);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(
    weekOptions[0]?.key ?? "",
  );

  const visibleData =
    weekOptions.length > 0
      ? data.filter((row) => row.weekKey === selectedWeekKey)
      : data;

  return (
    <div className="h-72 w-full rounded-md border border-slate-100 bg-white p-3">
      {weekOptions.length > 0 ? (
        <div className="mb-2 max-w-[260px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Select Week
          </label>
          <select
            value={selectedWeekKey}
            onChange={(event) => setSelectedWeekKey(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {weekOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visibleData} barGap={12} barCategoryGap="26%" margin={{ top: 14, right: 18, bottom: 6, left: 0 }}>
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
          <Bar dataKey="subject" name="Subject" fill="url(#weekdayWeekendSubject)" radius={[6, 6, 2, 2]}>
            <LabelList
              dataKey="subject"
              position="insideTop"
              content={(props: any) => {
                const value = typeof props?.value === "number" ? props.value : null;
                if (value === null) return null;
                return (
                  <text
                    x={(props.x ?? 0) + (props.width ?? 0) / 2}
                    y={(props.y ?? 0) + 12}
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    {formatCurrency(value)}
                  </text>
                );
              }}
            />
          </Bar>
          <Bar dataKey="comp" name="Comp Avg" fill="url(#weekdayWeekendComp)" radius={[6, 6, 2, 2]}>
            <LabelList
              dataKey="comp"
              position="insideTop"
              content={(props: any) => {
                const value = typeof props?.value === "number" ? props.value : null;
                if (value === null) return null;
                return (
                  <text
                    x={(props.x ?? 0) + (props.width ?? 0) / 2}
                    y={(props.y ?? 0) + 12}
                    fill="#0f172a"
                    fontSize={10}
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    {formatCurrency(value)}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
