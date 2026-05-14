"use client";

import { useState } from "react";
import { format, startOfMonth, startOfWeek } from "date-fns";

import { HotelRateComparisonChart } from "@/components/reports/hotel-rate-comparison-chart";
import { RatePositioningChart } from "@/components/reports/rate-positioning-chart";
import { Select } from "@/components/ui/select";

type Granularity = "DAILY" | "WEEKLY" | "MONTHLY";

type RatePositionPoint = {
  date: string;
  subjectRate: number | null;
  compAverage: number;
  subjectSoldOut?: boolean;
  allCompsSoldOut?: boolean;
};

type HotelRatePoint = { date: string } & Record<string, number | string | null>;

type HotelLine = {
  hotelId: string;
  hotelName: string;
  roleType: "SUBJECT" | "COMP";
};

function average(values: number[]) {
  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatBucketLabel(date: Date, granularity: Granularity) {
  if (granularity === "MONTHLY") {
    return format(date, "MMM yyyy");
  }
  if (granularity === "WEEKLY") {
    return format(date, "MMM d");
  }
  return format(date, "yyyy-MM-dd");
}

function getBucketDate(rawDate: string, granularity: Granularity) {
  const parsed = new Date(`${rawDate}T00:00:00`);
  if (granularity === "MONTHLY") {
    return startOfMonth(parsed);
  }
  if (granularity === "WEEKLY") {
    return startOfWeek(parsed, { weekStartsOn: 1 });
  }
  return parsed;
}

function aggregateRatePositionData(
  data: RatePositionPoint[],
  granularity: Granularity,
) {
  if (granularity === "DAILY") {
    return data;
  }

  const grouped = new Map<
    string,
    { bucketDate: Date; subjectRates: number[]; compRates: number[] }
  >();

  for (const point of data) {
    const bucketDate = getBucketDate(point.date, granularity);
    const key = bucketDate.toISOString();
    const existing = grouped.get(key) ?? {
      bucketDate,
      subjectRates: [],
      compRates: [],
    };
    if (typeof point.subjectRate === "number") {
      existing.subjectRates.push(point.subjectRate);
    }
    existing.compRates.push(point.compAverage);
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .sort((a, b) => a.bucketDate.getTime() - b.bucketDate.getTime())
    .map((entry) => ({
      date: formatBucketLabel(entry.bucketDate, granularity),
      subjectRate: average(entry.subjectRates),
      compAverage: average(entry.compRates) ?? 0,
      subjectSoldOut: false,
      allCompsSoldOut: false,
    }));
}

function aggregateHotelRateData(
  data: HotelRatePoint[],
  lines: HotelLine[],
  granularity: Granularity,
) {
  if (granularity === "DAILY") {
    return data;
  }

  const grouped = new Map<
    string,
    { bucketDate: Date; hotelValues: Record<string, number[]> }
  >();

  for (const point of data) {
    const bucketDate = getBucketDate(String(point.date), granularity);
    const key = bucketDate.toISOString();
    const existing = grouped.get(key) ?? { bucketDate, hotelValues: {} };

    for (const line of lines) {
      const rawValue = point[line.hotelId];
      if (typeof rawValue === "number") {
        existing.hotelValues[line.hotelId] =
          existing.hotelValues[line.hotelId] ?? [];
        existing.hotelValues[line.hotelId].push(rawValue);
      }
    }

    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .sort((a, b) => a.bucketDate.getTime() - b.bucketDate.getTime())
    .map((entry) => {
      const row: HotelRatePoint = {
        date: formatBucketLabel(entry.bucketDate, granularity),
      };

      for (const line of lines) {
        row[line.hotelId] = average(entry.hotelValues[line.hotelId] ?? []);
      }

      return row;
    });
}

function ChartCard({
  title,
  description,
  granularity,
  onGranularityChange,
  showGranularity = true,
  children,
}: {
  title: string;
  description: string;
  granularity: Granularity;
  onGranularityChange: (value: Granularity) => void;
  showGranularity?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-[0_20px_70px_-32px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 border-b border-sky-50 bg-transparent px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        {showGranularity ? (
          <div className="w-full md:ml-4 md:w-[180px] md:shrink-0">
            <Select
              value={granularity}
              onChange={(event) =>
                onGranularityChange(event.target.value as Granularity)
              }
              className="border-sky-100 bg-white text-slate-700"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

export function RateTrendPanels({
  ratePositionData,
  hotelRateData,
  hotelRateLines,
}: {
  ratePositionData: RatePositionPoint[];
  hotelRateData: HotelRatePoint[];
  hotelRateLines: HotelLine[];
}) {
  const [rateGranularity, setRateGranularity] = useState<Granularity>("DAILY");
  const [selectedHotelDate, setSelectedHotelDate] = useState<string>(
    hotelRateData[hotelRateData.length - 1]?.date
      ? String(hotelRateData[hotelRateData.length - 1].date)
      : "",
  );

  const visibleRatePositionData = aggregateRatePositionData(
    ratePositionData,
    rateGranularity,
  );
  const availableHotelDates = hotelRateData.map((row) => String(row.date));
  const fallbackDate =
    availableHotelDates[availableHotelDates.length - 1] ?? "";
  const effectiveHotelDate = availableHotelDates.includes(selectedHotelDate)
    ? selectedHotelDate
    : fallbackDate;
  const selectedHotelPoint =
    hotelRateData.find((row) => String(row.date) === effectiveHotelDate) ??
    null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="90-Day Rate Comparison"
        description="Subject pricing vs the rolling compset average across the most recent observed window."
        granularity={rateGranularity}
        onGranularityChange={setRateGranularity}
      >
        <RatePositioningChart data={visibleRatePositionData} />
      </ChartCard>

      <ChartCard
        title="Hotel-by-Hotel Rate Comparison"
        description="Pick a stay date from the calendar and compare each hotel's observed nightly rate in a bar chart."
        granularity={"DAILY"}
        onGranularityChange={() => {}}
        showGranularity={false}
      >
        <div className="mb-4 max-w-[240px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Select Date
          </label>
          <input
            type="date"
            value={effectiveHotelDate}
            min={availableHotelDates[0] ?? undefined}
            max={
              availableHotelDates[availableHotelDates.length - 1] ?? undefined
            }
            onChange={(event) => setSelectedHotelDate(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {hotelRateLines.length > 0 ? (
          <HotelRateComparisonChart
            selectedDate={effectiveHotelDate}
            point={selectedHotelPoint}
            lines={hotelRateLines}
          />
        ) : (
          <p className="text-sm text-slate-500">
            No hotel-level comparison data is available for this report.
          </p>
        )}
      </ChartCard>
    </div>
  );
}
