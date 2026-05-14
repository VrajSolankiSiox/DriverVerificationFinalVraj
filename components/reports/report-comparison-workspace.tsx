"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  DollarSign,
  Gauge,
  Globe,
  Hotel,
  LineChart,
  Radar,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReportStatus } from "@prisma/client";

import { CompetitiveGapsGrid } from "@/components/reports/competitive-gaps-grid";
import { GapHeatmap } from "@/components/reports/gap-heatmap";
import { OtaRatingComparisonChart } from "@/components/reports/ota-rating-comparison-chart";
import { RankDistributionChart } from "@/components/reports/rank-distribution-chart";
import { RateIndexChart } from "@/components/reports/rate-index-chart";
import { ReviewResponseGallery } from "@/components/reports/review-response-gallery";
import { RateTrendPanels } from "@/components/reports/rate-trend-panels";
import { WeekdayWeekendChart } from "@/components/reports/weekday-weekend-chart";
import { WebsiteScoreCards } from "@/components/reports/website-score-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import type { ReportViewModel } from "@/lib/reports/sections";
import {
  computeRateAnalytics,
  type AnalyticsObservation,
} from "@/lib/analytics/rate-analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";

const statCardStyles = [
  "border-blue-100 bg-white",
  "border-sky-100 bg-white",
  "border-indigo-100 bg-white",
  "border-emerald-100 bg-white",
] as const;

type CompareMode = "SINGLE_HOTEL" | "HOTEL_GROUP";

function normalizeHotelSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseOtaScore(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function SectionCard({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-sky-100 bg-white">
      <CardHeader className="border-b border-sky-50 bg-transparent">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
          {icon ? (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              {icon}
            </span>
          ) : null}
          {title}
        </CardTitle>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}

function buildHotelRateSeries(
  hotelIds: string[],
  hotelsById: Map<string, { id: string; name: string }>,
  subjectHotelId: string,
  observations: AnalyticsObservation[],
  dailyDates: string[],
) {
  const isSoldOut = (status?: string | null) =>
    String(status ?? "")
      .toLowerCase()
      .includes("sold_out") ||
    String(status ?? "")
      .toLowerCase()
      .includes("sold out");

  const lines = hotelIds
    .map((hotelId) => ({
      hotelId,
      hotelName: hotelsById.get(hotelId)?.name ?? hotelId,
      roleType:
        hotelId === subjectHotelId ? ("SUBJECT" as const) : ("COMP" as const),
    }))
    .sort((a, b) => {
      if (a.roleType === b.roleType) return 0;
      return a.roleType === "SUBJECT" ? -1 : 1;
    });

  const latestByHotelDate = new Map<
    string,
    { captureDate: Date; nightlyRate: number; soldOut: boolean }
  >();
  for (const row of observations) {
    const date = row.stayDate.toISOString().slice(0, 10);
    const key = `${row.hotelId}|${date}`;
    const existing = latestByHotelDate.get(key);
    if (!existing || existing.captureDate < row.captureDate) {
      latestByHotelDate.set(key, {
        captureDate: row.captureDate,
        nightlyRate: row.nightlyRate,
        soldOut: isSoldOut(row.availabilityStatus),
      });
    }
  }

  const points = dailyDates.map((date) => {
    const point: { date: string } & Record<string, number | string | null> = {
      date,
    };
    for (const line of lines) {
      const value = latestByHotelDate.get(`${line.hotelId}|${date}`);
      if (!value) {
        point[line.hotelId] = null;
      } else if (value.soldOut) {
        point[line.hotelId] = "SOLD_OUT";
      } else {
        point[line.hotelId] = value.nightlyRate;
      }
    }
    return point;
  });

  return { points, lines };
}

export function ReportComparisonWorkspace({
  report,
  viewModel,
}: {
  report: {
    id: string;
    status: ReportStatus;
    subjectHotel: { id: string; name: string };
    compSet: { name: string };
    uploadBatch: { fileName: string } | null;
  };
  viewModel: ReportViewModel;
}) {
  const baseHotels = viewModel.comparisonDataset?.hotels ?? [];
  const observations = viewModel.comparisonDataset?.observations ?? [];
  const reviewSnapshotsByHotel =
    viewModel.comparisonDataset?.reviewSnapshotsByHotel ?? {};
  const reviewResponseScreenshotsByHotel =
    viewModel.comparisonDataset?.reviewResponseScreenshotsByHotel ?? {};

  const hotels = useMemo(() => {
    const merged = new Map<
      string,
      {
        id: string;
        name: string;
        roleType: "SUBJECT" | "COMP";
        otaRatings?: Record<string, string | number>;
      }
    >();

    for (const hotel of baseHotels) {
      merged.set(hotel.id, hotel);
    }

    for (const row of observations) {
      if (!merged.has(row.hotelId)) {
        merged.set(row.hotelId, {
          id: row.hotelId,
          name: row.hotelName,
          roleType:
            row.hotelId === viewModel.subjectHotel.id ? "SUBJECT" : "COMP",
        });
      }
    }

    return [...merged.values()].sort((a, b) => {
      if (a.id === viewModel.subjectHotel.id) return -1;
      if (b.id === viewModel.subjectHotel.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [baseHotels, observations, viewModel.subjectHotel.id]);

  const initialSubjectId = viewModel.subjectHotel.id;
  const defaultCompIds = hotels
    .filter((h) => h.id !== initialSubjectId)
    .map((h) => h.id);

  const [subjectHotelId, setSubjectHotelId] = useState(initialSubjectId);
  const [compareMode, setCompareMode] = useState<CompareMode>("HOTEL_GROUP");
  const [singleHotelId, setSingleHotelId] = useState(defaultCompIds[0] ?? "");
  const [groupHotelIds, setGroupHotelIds] = useState<string[]>(defaultCompIds);
  const [hotelSearch, setHotelSearch] = useState("");
  const [markingConducted, setMarkingConducted] = useState(false);
  const [markStatus, setMarkStatus] = useState<string | null>(null);

  const hotelsById = useMemo(
    () =>
      new Map(
        hotels.map((hotel) => [hotel.id, { id: hotel.id, name: hotel.name }]),
      ),
    [hotels],
  );

  const comparisonCandidates = useMemo(
    () => hotels.filter((hotel) => hotel.id !== subjectHotelId),
    [hotels, subjectHotelId],
  );

  const filteredCandidates = useMemo(() => {
    const q = hotelSearch.trim().toLowerCase();
    if (!q) return comparisonCandidates;
    const normalizedQuery = normalizeHotelSearch(q);
    return comparisonCandidates.filter((hotel) => {
      const name = hotel.name.toLowerCase();
      if (name.includes(q)) return true;
      return normalizeHotelSearch(name).includes(normalizedQuery);
    });
  }, [comparisonCandidates, hotelSearch]);

  const selectedCompIds = useMemo(() => {
    if (compareMode === "SINGLE_HOTEL") {
      return singleHotelId && singleHotelId !== subjectHotelId
        ? [singleHotelId]
        : [];
    }
    return groupHotelIds.filter((id) => id !== subjectHotelId);
  }, [compareMode, singleHotelId, groupHotelIds, subjectHotelId]);

  const selectedHotelIds = useMemo(
    () => [subjectHotelId, ...selectedCompIds],
    [subjectHotelId, selectedCompIds],
  );

  const analyticsInput = useMemo<AnalyticsObservation[]>(() => {
    const selectedSet = new Set(selectedHotelIds);
    return observations
      .filter((row) => selectedSet.has(row.hotelId))
      .map((row) => ({
        hotelId: row.hotelId,
        hotelName: hotelsById.get(row.hotelId)?.name ?? row.hotelId,
        roleType:
          row.hotelId === subjectHotelId
            ? ("SUBJECT" as const)
            : ("COMP" as const),
        stayDate: new Date(row.stayDate),
        captureDate: new Date(row.captureDate),
        nightlyRate: row.nightlyRate,
        currency: row.currency,
        availabilityStatus: row.availabilityStatus ?? null,
        roomType: row.roomType ?? null,
      }));
  }, [observations, selectedHotelIds, hotelsById, subjectHotelId]);

  const analytics = useMemo(
    () => computeRateAnalytics(analyticsInput, subjectHotelId, 90),
    [analyticsInput, subjectHotelId],
  );

  const hotelRateSeries = useMemo(
    () =>
      buildHotelRateSeries(
        selectedHotelIds,
        hotelsById,
        subjectHotelId,
        analyticsInput,
        analytics.daily.map((d) => d.date),
      ),
    [
      selectedHotelIds,
      hotelsById,
      subjectHotelId,
      analyticsInput,
      analytics.daily,
    ],
  );

  const summary90 = analytics.summariesByWindow["90"];
  const compCount = selectedCompIds.length;

  const subjectName =
    hotelsById.get(subjectHotelId)?.name ?? viewModel.subjectHotel.name;
  const subjectRatings = useMemo(() => {
    const map: Record<string, number> = {};
    const originalSubject = subjectHotelId === viewModel.subjectHotel.id;
    if (originalSubject) {
      const hotelOta = viewModel.subjectHotel.otaRatings ?? {};
      for (const [key, value] of Object.entries(hotelOta)) {
        const n = parseOtaScore(value);
        if (n !== null) map[key] = n;
      }
      const subjectMemberOta = viewModel.compSet.subjectOtaRatings ?? {};
      for (const [key, value] of Object.entries(subjectMemberOta)) {
        if (map[key] !== undefined) continue;
        const n = parseOtaScore(value);
        if (n !== null) map[key] = n;
      }
    }

    const member = hotels.find((h) => h.id === subjectHotelId);
    for (const [key, value] of Object.entries(member?.otaRatings ?? {})) {
      if (map[key] !== undefined) continue;
      const n = parseOtaScore(value);
      if (n !== null) map[key] = n;
    }

    return map;
  }, [
    subjectHotelId,
    viewModel.subjectHotel,
    viewModel.compSet.subjectOtaRatings,
    hotels,
  ]);

  const otaCompetitors = useMemo(
    () =>
      selectedCompIds.map((hotelId) => {
        const member = hotels.find((h) => h.id === hotelId);
        const ratings: Record<string, number> = {};
        for (const [key, value] of Object.entries(member?.otaRatings ?? {})) {
          const n = parseOtaScore(value);
          if (n !== null) ratings[key] = n;
        }
        return {
          name: member?.name ?? hotelId,
          ratings,
        };
      }),
    [selectedCompIds, hotels],
  );

  const reviewSubject = reviewSnapshotsByHotel[subjectHotelId] ?? [];
  const reviewComps = selectedCompIds.map((hotelId) => ({
    hotelId,
    hotelName: hotelsById.get(hotelId)?.name ?? hotelId,
    snapshots: reviewSnapshotsByHotel[hotelId] ?? [],
  }));
  const reviewResponseHotels = [
    {
      hotelId: subjectHotelId,
      hotelName: hotelsById.get(subjectHotelId)?.name ?? subjectHotelId,
      screenshots: reviewResponseScreenshotsByHotel[subjectHotelId] ?? [],
    },
  ];

  const competitiveGaps = buildCompetitiveGaps(
    analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore: viewModel.includeSeoComparison
        ? (viewModel.websiteAudit?.seoScoreTotal ??
          viewModel.seoAudit?.total ??
          null)
        : null,
      reviewSubject,
      reviewComps,
    },
  );

  const hasWebsiteData = viewModel.websiteAudit?.scoreTotal != null;
  const hasSeoData =
    viewModel.includeSeoComparison &&
    (viewModel.websiteAudit?.seoScoreTotal ??
      viewModel.seoAudit?.total ??
      null) != null;

  const visibleCompetitiveGaps = competitiveGaps.filter((gap) => {
    if (
      gap.metric === "Website score" &&
      (!hasWebsiteData || !viewModel.includeSeoComparison)
    ) {
      return false;
    }
    if (gap.metric === "SEO" && !hasSeoData) {
      return false;
    }
    return true;
  });

  const weekdayWeekendData = [
    {
      label: "Weekday",
      subject: analytics.weekdayWeekend.weekdaySubjectAverage,
      comp: analytics.weekdayWeekend.weekdayCompAverage,
    },
    {
      label: "Weekend",
      subject: analytics.weekdayWeekend.weekendSubjectAverage,
      comp: analytics.weekdayWeekend.weekendCompAverage,
    },
  ];

  const metricCards = [
    {
      label: "Avg Subject Rate",
      value: formatCurrency(summary90.avgSubjectRate),
      note: "Observed public rate",
      icon: DollarSign,
      iconTint: "text-blue-700 bg-blue-100 border-blue-200",
    },
    {
      label: "Avg Comp Average",
      value: formatCurrency(summary90.avgCompAverageRate),
      note: "Competitive market average",
      icon: LineChart,
      iconTint: "text-sky-700 bg-sky-100 border-sky-200",
    },
    {
      label: "Avg Rate Index",
      value: formatNumber(summary90.avgRateIndex, 2),
      note:
        summary90.avgRateIndex >= 1
          ? "Priced above comps"
          : "Priced below comps",
      icon: Gauge,
      iconTint: "text-indigo-700 bg-indigo-100 border-indigo-200",
    },
    {
      label: "Median Gap",
      value: formatCurrency(summary90.medianGap),
      note: "Middle-of-market delta",
      icon: TrendingUp,
      iconTint: "text-emerald-700 bg-emerald-100 border-emerald-200",
    },
  ];

  return (
    <div className="relative space-y-6 overflow-hidden -mt-3">
      <section className="relative overflow-hidden rounded-md border border-sky-100 bg-white px-5 py-6 text-slate-900 shadow-md md:px-8 md:py-8">
        <svg
          viewBox="0 0 500 160"
          className="pointer-events-none absolute -right-16 -top-12 h-44 w-[32rem] opacity-[0.08]"
          aria-hidden
        >
          <path d="M0 120 C80 10, 180 10, 260 120 S420 230, 500 120" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="80" cy="88" r="6" fill="currentColor" />
          <circle cx="180" cy="76" r="6" fill="currentColor" />
          <circle cx="280" cy="98" r="6" fill="currentColor" />
          <circle cx="380" cy="118" r="6" fill="currentColor" />
        </svg>
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl space-y-4">
            {/* <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-sky-100 bg-sky-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-800">
                {report.status}
              </Badge>
              <Badge className="border-blue-100 bg-blue-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-800">
                Confidence {analytics.confidenceLevel}
              </Badge>
            </div> */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-sky-700">
                Performance Report
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {subjectName}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Competitive readout for {report.compSet.name}. Use the
                comparison controls below to switch between single-hotel and
                group benchmarking.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              {report.uploadBatch ? (
                <span className="rounded-full border border-sky-100 bg-sky-50/60 px-3 py-1.5">
                  Data source: {report.uploadBatch.fileName}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/reports/${report.id}/present`}>
                Presentation mode
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={markingConducted}
              onClick={async () => {
                setMarkStatus(null);
                setMarkingConducted(true);
                try {
                  const response = await fetch("/api/demos/mark-conducted", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      reportId: report.id,
                      hotelId: report.subjectHotel.id,
                    }),
                  });
                  const result = await response.json();
                  if (!response.ok) {
                    setMarkStatus(result.error || "Failed to mark as conducted.");
                    return;
                  }
                  setMarkStatus("Demo marked as conducted.");
                } finally {
                  setMarkingConducted(false);
                }
              }}
            >
              {markingConducted ? "Marking..." : "Mark Conducted"}
            </Button>
          </div>
          {markStatus ? <p className="w-full text-sm text-slate-600">{markStatus}</p> : null}
        </div>
      </section>

      <SectionCard
        title="Comparison Setup"
        description="Choose a subject hotel, then compare against one hotel or a selected hotel group. Charts and report metrics update instantly."
        icon={<Hotel className="h-4 w-4" />}
      >
        <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_46%,#eef5ff_100%)] p-4 shadow-[0_14px_40px_-28px_rgba(30,64,175,0.45)] md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_auto_minmax(340px,1.25fr)] xl:items-start">
            <div className="space-y-2.5 rounded-xl border border-sky-100 bg-white/90 p-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Subject
                </p>
                <h3 className="text-sm font-semibold text-slate-900">
                  Primary Hotel
                </h3>
              </div>
              <select
                value={subjectHotelId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSubjectHotelId(next);
                  if (singleHotelId === next) {
                    const replacement =
                      hotels.find((h) => h.id !== next)?.id ?? "";
                    setSingleHotelId(replacement);
                  }
                  setGroupHotelIds((prev) => prev.filter((id) => id !== next));
                }}
                className="h-11 w-full rounded-xl border border-sky-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden items-center justify-center xl:flex">
              <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                vs
              </div>
            </div>

            <div className="space-y-3.5 rounded-xl border border-blue-100 bg-white/95 p-4">
              <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => setCompareMode("SINGLE_HOTEL")}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${compareMode === "SINGLE_HOTEL" ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
                >
                  Single Hotel
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode("HOTEL_GROUP")}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${compareMode === "HOTEL_GROUP" ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
                >
                  Hotel Group
                </button>
              </div>

              {compareMode === "SINGLE_HOTEL" ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Compare Against
                  </label>
                  <select
                    value={singleHotelId}
                    onChange={(event) => setSingleHotelId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {comparisonCandidates.map((hotel) => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Compare Against Group
                  </label>
                  <input
                    value={hotelSearch}
                    onChange={(event) => setHotelSearch(event.target.value)}
                    placeholder="Search hotels..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex items-center justify-between px-0.5 text-xs text-slate-500">
                    <span>{filteredCandidates.length} hotel(s)</span>
                    <span>{groupHotelIds.length} selected</span>
                  </div>
                  <div className="max-h-[22rem] space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                    {filteredCandidates.map((hotel) => {
                      const checked = groupHotelIds.includes(hotel.id);
                      return (
                        <label
                          key={hotel.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${checked ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-100 bg-slate-50/60 text-slate-700 hover:border-slate-200"}`}
                        >
                          <span className="pr-3">{hotel.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setGroupHotelIds((prev) => [...prev, hotel.id]);
                              } else {
                                setGroupHotelIds((prev) =>
                                  prev.filter((id) => id !== hotel.id),
                                );
                              }
                            }}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card, index) => (
          <Card
            key={card.label}
            className={`rounded-[24px] border ${statCardStyles[index]}`}
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {card.label}
                </p>
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${card.iconTint}`}
                >
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-semibold tracking-tight text-slate-950">
                {card.value}
              </div>
              <p className="text-sm text-slate-600">{card.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <SectionCard
        title="Competitive Performance Snapshot"
        description="A quick editorial read on where the subject hotel is strong, soft, or visibly lagging against the selected comparison set."
        icon={<Radar className="h-4 w-4" />}
      >
        <CompetitiveGapsGrid gaps={visibleCompetitiveGaps} />
      </SectionCard>

      <RateTrendPanels
        ratePositionData={analytics.daily}
        hotelRateData={hotelRateSeries.points}
        hotelRateLines={hotelRateSeries.lines}
      />

      <SectionCard
        title="Rate Index Over Time"
        description="Rate index above `1.00` means the subject is priced above the selected comparison average. Below `1.00` means it is trailing."
        icon={<LineChart className="h-4 w-4" />}
      >
        <RateIndexChart
          data={analytics.daily.map((row) => ({
            date: row.date,
            rateIndex: row.rateIndex,
          }))}
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Weekday vs Weekend Positioning"
          description="A simplified split so pricing behavior is easier to read at a glance."
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <WeekdayWeekendChart data={weekdayWeekendData} />
        </SectionCard>

        <SectionCard
          title="Subject Rank Distribution"
          description="How often the subject appears lowest, middle, highest, or missing across observed dates."
          icon={<Activity className="h-4 w-4" />}
        >
          <RankDistributionChart distribution={analytics.rankDistribution} />
        </SectionCard>
      </div>

      <SectionCard
        title="Daily Gap Heatmap"
        description="Dense daily readout of how far the subject sits above or below the selected comparison average."
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <GapHeatmap
          rows={analytics.daily.map((row) => ({
            date: row.date,
            gapToCompAverage: row.gapToCompAverage,
          }))}
        />
      </SectionCard>

      {hasWebsiteData && viewModel.includeSeoComparison ? (
        <SectionCard
          title="Website Audit Findings"
          description="Website scoring is displayed as a supporting layer to keep insights readable."
          icon={<Globe className="h-4 w-4" />}
        >
          <WebsiteScoreCards audit={viewModel.websiteAudit} />
        </SectionCard>
      ) : null}

      <SectionCard
        title="OTA Rating Comparison"
        description="Compare subject OTA ratings against the selected comparison hotel(s)."
        icon={<Search className="h-4 w-4" />}
      >
        <OtaRatingComparisonChart
          data={{
            subjectRatings,
            competitors: otaCompetitors,
            subjectName,
          }}
        />
      </SectionCard>

      <SectionCard
        title="Review Response Screenshots"
        description="Uploaded review-response evidence for the selected subject hotel only."
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <ReviewResponseGallery hotels={reviewResponseHotels} />
      </SectionCard>
    </div>
  );
}
