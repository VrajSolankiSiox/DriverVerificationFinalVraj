"use client";

import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/utils";

type LineDef = {
  hotelId: string;
  hotelName: string;
  roleType: "SUBJECT" | "COMP";
};

const compColors = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#bfdbfe",
  "#dbeafe",
];

function formatAxisLabel(value: string) {
  if (!value.includes("-")) {
    return value;
  }

  try {
    return format(parseISO(value), "MM/dd/yy");
  } catch {
    return value;
  }
}

export function HotelRateComparisonChart({
  point,
  lines,
  selectedDate,
}: {
  point: ({ date: string } & Record<string, number | string | null>) | null;
  lines: LineDef[];
  selectedDate: string;
}) {
  const chartData = lines
    .map((line) => ({
      hotelId: line.hotelId,
      hotelName: line.hotelName,
      roleType: line.roleType,
      soldOut: point?.[line.hotelId] === "SOLD_OUT",
      rate: typeof point?.[line.hotelId] === "number" ? Number(point[line.hotelId]) : 0,
      hasValue: typeof point?.[line.hotelId] === "number" || point?.[line.hotelId] === "SOLD_OUT",
    }))
    .filter((row) => row.hasValue);

  return (
    <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.96))] p-3">
      <div className="mb-3 text-sm text-slate-600">
        Showing rates for{" "}
        <span className="font-semibold text-slate-900">
          {formatAxisLabel(selectedDate)}
        </span>
      </div>
      {chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500">
          No hotel rate data is available for this date.
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 14, right: 20, bottom: 14, left: 0 }}
            >
              <CartesianGrid
                stroke="#d8e7f1"
                strokeDasharray="3 6"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, "dataMax"]}
                tickFormatter={(value) => `$${value}`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                type="category"
                dataKey="hotelName"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                formatter={(value, _name, item) => {
                  const payload = item?.payload as { soldOut?: boolean } | undefined;
                  if (payload?.soldOut) return ["Sold out", "Rate"];
                  return typeof value === "number" ? formatCurrency(value) : "-";
                }}
                cursor={{ fill: "#fafafa" }}
                labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid #dbeafe",
                  background: "rgba(255,255,255,0.98)",
                  boxShadow: "0 20px 46px -28px rgba(15,23,42,0.35)",
                }}
              />
              <Bar
                dataKey="rate"
                radius={[0, 8, 8, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="rate"
                  position="right"
                  content={(props: any) => {
                    if (!props?.payload?.soldOut) return null;
                    return (
                      <text
                        x={(props.x ?? 0) + (props.width ?? 0) + 6}
                        y={(props.y ?? 0) + (props.height ?? 0) / 2}
                        fill="#b45309"
                        fontSize={12}
                        fontWeight={700}
                        dominantBaseline="middle"
                      >
                        X
                      </text>
                    );
                  }}
                  fill="#b45309"
                  fontSize={12}
                  fontWeight={700}
                />
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.hotelId}
                    fill={
                      entry.soldOut
                        ? "#f59e0b"
                        : entry.roleType === "SUBJECT"
                        ? "#3b1496"
                        : compColors[index % compColors.length]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
