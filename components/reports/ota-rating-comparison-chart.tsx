"use client";

import { useState, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";

/* Rating scale definitions */
const OTA_SCALES: Record<string, { min: number; max: number; label: string }> = {
  "Booking.com": { min: 2.5, max: 10, label: "2.5 - 10" },
  Booking: { min: 2.5, max: 10, label: "2.5 - 10" },
  Expedia: { min: 0, max: 10, label: "0 - 10" },
  Agoda: { min: 2, max: 10, label: "2 - 10" },
  "Hotels.com": { min: 0, max: 10, label: "0 - 10" },
  Priceline: { min: 1, max: 10, label: "1 - 10" },
  "Google Business": { min: 1, max: 5, label: "1 - 5" },
  Google: { min: 1, max: 5, label: "1 - 5" },
};

function getScale(platform: string) {
  return OTA_SCALES[platform] ?? { min: 0, max: 10, label: "0 - 10" };
}

/** Normalize any OTA rating to a 0-10 scale */
function normalize(raw: number, platform: string): number {
  const { min, max } = getScale(platform);
  if (max === min) return 0;
  const normalized = ((raw - min) / (max - min)) * 10;
  // Clamp between 0 and 10 to prevent over-inflated numbers
  return Math.max(0, Math.min(10, normalized));
}

/* Platform icon colors (matching reference design) */
const PLATFORM_COLORS: Record<string, string> = {
  "Booking.com": "#1d4ed8",
  Booking: "#1d4ed8",
  Expedia: "#0f766e",
  Agoda: "#334155",
  "Hotels.com": "#0369a1",
  Priceline: "#1e3a8a",
  "Google Business": "#475569",
  Google: "#475569",
};

function platformColor(p: string) {
  return PLATFORM_COLORS[p] ?? "#6366f1";
}

/* Types */
export type OtaComparisonInput = {
  /** Subject hotel OTA ratings (key = platform name, value = raw rating) */
  subjectRatings: Record<string, number>;
  /** Each competitor with their OTA ratings */
  competitors: Array<{
    name: string;
    ratings: Record<string, number>;
  }>;
  subjectName: string;
};

/* Main component */
export function OtaRatingComparisonChart({ data }: { data: OtaComparisonInput }) {
  const { subjectRatings, competitors, subjectName } = data;
  const isTripAdvisor = (platform: string) =>
    platform.trim().toLowerCase() === "tripadvisor";

  /* Discover all platforms across subject + comps */
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    Object.keys(subjectRatings).forEach((p) => set.add(p));
    competitors.forEach((c) => Object.keys(c.ratings).forEach((p) => set.add(p)));
    return [...set].filter((p) => !isTripAdvisor(p));
  }, [subjectRatings, competitors]);

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const visiblePlatforms = selectedPlatform ? [selectedPlatform] : allPlatforms;

  /* Per-platform stats */
  const platformStats = useMemo(() => {
    return allPlatforms.map((platform) => {
      const subjectRaw = subjectRatings[platform] ?? null;
      const compRaws = competitors
        .map((c) => c.ratings[platform])
        .filter((v): v is number => v !== undefined && Number.isFinite(v));
      const compAvgRaw = compRaws.length
        ? compRaws.reduce((s, v) => s + v, 0) / compRaws.length
        : null;

      const subjectNorm = subjectRaw !== null ? normalize(subjectRaw, platform) : null;
      const compAvgNorm = compAvgRaw !== null ? normalize(compAvgRaw, platform) : null;

      return {
        platform,
        subjectRaw,
        compAvgRaw,
        subjectNorm,
        compAvgNorm,
        diff: subjectNorm !== null && compAvgNorm !== null ? subjectNorm - compAvgNorm : null,
      };
    });
  }, [allPlatforms, subjectRatings, competitors]);

  /* Aggregated averages (normalized) */
  const overallSubjectAvg = useMemo(() => {
    const vals = platformStats.filter((p) => p.subjectNorm !== null).map((p) => p.subjectNorm!);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }, [platformStats]);

  const overallCompAvg = useMemo(() => {
    const vals = platformStats.filter((p) => p.compAvgNorm !== null).map((p) => p.compAvgNorm!);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }, [platformStats]);

  const overallDiff =
    overallSubjectAvg !== null && overallCompAvg !== null
      ? overallSubjectAvg - overallCompAvg
      : null;

  const outperformCount = platformStats.filter(
    (p) => p.diff !== null && p.diff > 0,
  ).length;

  /* Chart data */
  const hotelsForChart = useMemo(
    () => [{ name: subjectName, ratings: subjectRatings }, ...competitors],
    [subjectName, subjectRatings, competitors],
  );
  const chartData = useMemo(
    () =>
      visiblePlatforms.map((platform) => {
        const row: Record<string, number | string | null> = { platform };
        for (const hotel of hotelsForChart) {
          const raw = hotel.ratings[platform];
          row[hotel.name] = Number.isFinite(raw) ? Number(normalize(raw, platform).toFixed(2)) : null;
        }
        return row;
      }),
    [visiblePlatforms, hotelsForChart],
  );

  if (allPlatforms.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No OTA ratings have been added to this compset. Add OTA platform ratings
        when editing the compset to see this comparison.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Ratings are normalized to a 10-point scale for comparison.
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            View original scores in each OTA&apos;s own scale in the summary
            table below.
          </p>
        </div>
      </div>

      {/* Platform filter tabs */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Select OTA
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedPlatform(null)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              selectedPlatform === null
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-blue-100 bg-blue-50/40 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            All OTAs
          </button>
          {allPlatforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                setSelectedPlatform((prev) => (prev === p ? null : p))
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                selectedPlatform === p
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-blue-100 bg-blue-50/40 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: platformColor(p) }}
              />
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Your Property Average */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Your Property Average
            <span className="ml-1 font-normal text-slate-400">(Normalized)</span>
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-4xl font-bold tracking-tight text-slate-900">
              {overallSubjectAvg !== null ? overallSubjectAvg.toFixed(2) : "-"}
            </span>
            {overallDiff !== null && (
              <span
                className={`mb-1 text-sm font-semibold ${
                  overallDiff >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {overallDiff >= 0 ? "↑" : "↓"} {Math.abs(overallDiff).toFixed(2)}{" "}
                vs comp avg
              </span>
            )}
          </div>
        </div>

        {/* Comp Average */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Competitor Average
            <span className="ml-1 font-normal text-slate-400">(Normalized)</span>
          </p>
          <span className="mt-3 block text-4xl font-bold tracking-tight text-slate-900">
            {overallCompAvg !== null ? overallCompAvg.toFixed(2) : "-"}
          </span>
        </div>

        {/* About Rating Scales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            About Rating Scales
          </p>
          <div className="space-y-2">
            {allPlatforms.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: platformColor(p) }}
                  />
                  {p}
                </span>
                <span className="font-medium text-slate-500">
                  {getScale(p).label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Rating Comparison{" "}
            <span className="font-normal text-slate-400">
              (Normalized to 10-point scale)
            </span>
          </p>
          <p className="mb-4 text-[11px] text-slate-400">Rating (0 - 10)</p>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, bottom: 10, left: 0 }}
                barCategoryGap="20%"
                barGap={4}
              >
                <defs>
                  <linearGradient id="otaSubjectFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="platform"
                  tick={{ fill: "#475569", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <ReferenceLine y={5} stroke="#e2e8f0" strokeDasharray="2 4" />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    typeof value === "number" ? value.toFixed(2) : "-",
                    String(name),
                  ]}
                  labelStyle={{ color: "#0f172a", fontWeight: 700, fontSize: 13 }}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    background: "rgba(255,255,255,0.98)",
                    boxShadow: "0 10px 30px -12px rgba(15,23,42,0.18)",
                    fontSize: 13,
                  }}
                  cursor={{ fill: "rgba(186,230,253,0.16)" }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="rect"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12, color: "#475569", paddingBottom: 12 }}
                />
                {hotelsForChart.map((hotel, index) => (
                  <Bar
                    key={hotel.name}
                    dataKey={hotel.name}
                    fill={
                      index === 0
                        ? "url(#otaSubjectFill)"
                        : ["#0f766e", "#0369a1", "#1e3a8a", "#334155", "#0c4a6e", "#155e75", "#475569"][
                            (index - 1) % 7
                          ]
                    }
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Info: All ratings are normalized to a 10-point scale for accurate
            comparison across different rating systems.
          </p>
      </div>

      {/* Individual competitor breakdown */}
      {competitors.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Individual Competitor Ratings
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Hotel
                  </th>
                  {allPlatforms.map((p) => (
                    <th
                      key={p}
                      className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      <span className="flex items-center justify-end gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: platformColor(p) }}
                        />
                        {p}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Subject row */}
                <tr className="bg-blue-50/40">
                  <td className="py-2.5 pr-4 font-semibold text-blue-900">
                    {subjectName}
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      Subject
                    </span>
                  </td>
                  {allPlatforms.map((p) => {
                    const raw = subjectRatings[p];
                    return (
                      <td
                        key={p}
                        className="py-2.5 text-right font-medium text-slate-900"
                      >
                        {raw !== undefined ? raw : "-"}
                      </td>
                    );
                  })}
                </tr>
                {/* Competitors */}
                {competitors.map((comp) => (
                  <tr key={comp.name}>
                    <td className="py-2.5 pr-4 text-slate-700">{comp.name}</td>
                    {allPlatforms.map((p) => {
                      const raw = comp.ratings[p];
                      return (
                        <td
                          key={p}
                          className="py-2.5 text-right font-medium text-slate-900"
                        >
                          {raw !== undefined ? raw : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance banner */}
      {overallDiff !== null && (
        <div
          className={`flex items-center gap-4 rounded-2xl border px-6 py-4 ${
            overallDiff >= 0
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-red-200 bg-red-50/70"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              overallDiff >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {overallDiff >= 0 ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                />
              </svg>
            )}
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                overallDiff >= 0 ? "text-emerald-900" : "text-red-900"
              }`}
            >
              {overallDiff >= 0
                ? `You're outperforming the competitor average on ${outperformCount} out of ${allPlatforms.length} OTAs.`
                : `You're trailing the competitor average on ${allPlatforms.length - outperformCount} out of ${allPlatforms.length} OTAs.`}
            </p>
            <p
              className={`mt-0.5 text-xs ${
                overallDiff >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {overallDiff >= 0
                ? `Keep up the great work! Your overall rating is ${Math.abs(overallDiff).toFixed(2)} points higher than the competitor average.`
                : `Your overall rating is ${Math.abs(overallDiff).toFixed(2)} points below the competitor average. Focus on improving guest satisfaction.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


