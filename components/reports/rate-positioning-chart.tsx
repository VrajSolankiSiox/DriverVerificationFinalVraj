"use client";

import { format, parseISO } from "date-fns";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

function formatAxisLabel(value: string) {
  if (!value.includes("-")) {
    return value;
  }

  try {
    return format(parseISO(value), "dd MMM yy");
  } catch {
    return value;
  }
}

export function RatePositioningChart({
  data,
}: {
  data: Array<{
    date: string;
    subjectRate: number | null;
    compAverage: number;
    subjectSoldOut?: boolean;
    allCompsSoldOut?: boolean;
  }>;
}) {
  const chartData = data.map((row) => ({
    ...row,
    subjectRate: row.subjectSoldOut ? null : row.subjectRate,
    compAverage: row.allCompsSoldOut ? null : row.compAverage,
  }));
  const chartWidth = Math.max(720, chartData.length * 56);

  return (
    <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.96))] p-3">
      <div className="h-80 w-full overflow-x-auto overflow-y-hidden">
        <div className="h-full" style={{ width: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 18, right: 16, bottom: 6, left: 0 }}
            >
          <defs>
            <linearGradient
              id="ratePositionSubjectFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#cfe7f3"
            strokeDasharray="3 6"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisLabel}
            tick={{ fill: "#4b5563", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={10}
            angle={-28}
            textAnchor="end"
            height={58}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fill: "#4b5563", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value, name, item) => {
              const payload = (item?.payload ?? {}) as { subjectSoldOut?: boolean; allCompsSoldOut?: boolean };
              if (name === "Subject" && payload.subjectSoldOut) return ["Sold out", "Subject"];
              if (name === "Comp Avg" && payload.allCompsSoldOut) return ["Sold out", "Comp Avg"];
              return [typeof value === "number" ? formatCurrency(Number(value)) : "-", String(name)];
            }}
            labelStyle={{ color: "#0f172a", fontWeight: 700 }}
            contentStyle={{
              borderRadius: "18px",
              border: "1px solid #dbeafe",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 18px 40px -22px rgba(37,99,235,0.22)",
            }}
            cursor={{
              stroke: "#93c5fd",
              strokeWidth: 1.5,
              strokeDasharray: "4 4",
            }}
          />
          <Legend
            verticalAlign="top"
            height={30}
            iconType="circle"
            wrapperStyle={{
              fontSize: "12px",
              color: "#475569",
              paddingBottom: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="subjectRate"
            fill="url(#ratePositionSubjectFill)"
            stroke="none"
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="subjectRate"
            name="Subject"
            stroke="#1d4ed8"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
              fill: "#1d4ed8",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="compAverage"
            name="Comp Avg"
            stroke="#64748b"
            strokeWidth={2.2}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#000",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
