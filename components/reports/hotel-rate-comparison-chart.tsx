"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  "#1e40af", // darker shade
  "#1d4ed8", // rich blue
  "#2563eb", // original
  "#3b82f6", // lighter blue
  "#60a5fa", // soft blue
  "#93c5fd", // pastel blue
  "#bfdbfe", // pale blue
  "#dbeafe", // very light blue
];

function getLineColor(line: LineDef, compIndex: number) {
  if (line.roleType === "SUBJECT") {
    return "#2563eb";
  }
  return compColors[compIndex % compColors.length];
}

export function HotelRateComparisonChart({
  data,
  lines,
}: {
  data: Array<{ date: string } & Record<string, number | string | null>>;
  lines: LineDef[];
}) {
  const compCounter = { current: 0 };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.slice(0, 30)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value) => {
              if (typeof value !== "number" || Number.isNaN(value)) {
                return "—";
              }
              return formatCurrency(value);
            }}
          />
          <Legend />
          {lines.map((line) => {
            const compIndex =
              line.roleType === "COMP" ? compCounter.current++ : 0;
            return (
              <Line
                key={line.hotelId}
                type="monotone"
                dataKey={line.hotelId}
                name={
                  line.roleType === "SUBJECT"
                    ? `🏨 ${line.hotelName} (Subject)`
                    : `🏨 ${line.hotelName}`
                }
                stroke={getLineColor(line, compIndex)}
                strokeWidth={line.roleType === "SUBJECT" ? 4 : 2.5}
                strokeDasharray={line.roleType === "SUBJECT" ? "0" : "6 4"}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                connectNulls={false}
                animationDuration={900}
                animationEasing="ease-in-out"
                opacity={line.roleType === "SUBJECT" ? 1 : 0.75}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
