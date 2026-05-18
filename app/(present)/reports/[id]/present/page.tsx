import { CompetitiveGapsGrid } from "@/components/reports/competitive-gaps-grid";
import { OtaRatingComparisonChart } from "@/components/reports/ota-rating-comparison-chart";
import { OwnerFeedbackSlide } from "@/components/reports/owner-feedback-slide";
import { PresentationCoverSlide } from "@/components/reports/presentation-cover-slide";
import { PresentationRuntime } from "@/components/presentations/presentation-runtime";
import { RankDistributionChart } from "@/components/reports/rank-distribution-chart";
import { ReviewResponseGallery } from "@/components/reports/review-response-gallery";
import { RateTrendPanels } from "@/components/reports/rate-trend-panels";
import { WeekdayWeekendChart } from "@/components/reports/weekday-weekend-chart";
import { WebsiteScoreCards } from "@/components/reports/website-score-cards";
import {
  computeRateAnalytics,
  type AnalyticsObservation,
} from "@/lib/analytics/rate-analytics";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import type { ReportViewModel } from "@/lib/reports/sections";
import { buildReportViewModel } from "@/lib/services/reports";
// import { getPresentationById } from "@/lib/services/presentations";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";
// import { presentationSlideDefinitions } from "@/lib/presentations/slides";
import { cookies } from "next/headers";

const talkingPoints: Record<string, string> = {
  cover:
    "Frame the narrative: this is an outside-in competitive read, not an internal revenue claim.",
  summary:
    "Open with the biggest deltas and show how pricing posture compares with the market.",
  pricingTrends:
    "Show whether under- or over-positioning is persistent and where competitors separate.",
  compSnapshot:
    "Highlight where the subject wins and where visible gaps require action.",
  mixAndRank:
    "Use these distributions to explain how often the subject truly leads or trails.",
  website: "Connect website quality to rate and conversion narrative.",
  ota: "Show platform-by-platform reputation pressure versus competitors.",
  reviewResponses:
    "Use visual proof of response activity to support the reputation management narrative.",
  actions: "End with a practical action sequence tied to observed gaps.",
};

function parseOtaScore(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildWeekwiseWeekdayWeekendData(
  daily: Array<{
    date: string;
    subjectRate: number | null;
    compAverage: number;
  }>,
) {
  const buckets = new Map<
    string,
    {
      monthLabel: string;
      weekNumber: number;
      weekdaySubject: number[];
      weekdayComp: number[];
      weekendSubject: number[];
      weekendComp: number[];
    }
  >();

  for (const row of daily) {
    const d = new Date(`${row.date}T00:00:00`);
    const monthLabel = d.toLocaleString("en-US", { month: "short" });
    const weekNumber = Math.floor((d.getDate() - 1) / 7) + 1;
    const key = `${d.getFullYear()}-${d.getMonth()}-${weekNumber}`;
    const bucket = buckets.get(key) ?? {
      monthLabel,
      weekNumber,
      weekdaySubject: [],
      weekdayComp: [],
      weekendSubject: [],
      weekendComp: [],
    };
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      if (row.subjectRate !== null) bucket.weekendSubject.push(row.subjectRate);
      if (row.compAverage > 0) bucket.weekendComp.push(row.compAverage);
    } else {
      if (row.subjectRate !== null) bucket.weekdaySubject.push(row.subjectRate);
      if (row.compAverage > 0) bucket.weekdayComp.push(row.compAverage);
    }

    buckets.set(key, bucket);
  }

  const avg = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

  return [...buckets.values()]
    .sort((a, b) => a.weekNumber - b.weekNumber)
    .flatMap((bucket) => [
      {
        label: "Weekday",
        weekKey: `${bucket.monthLabel}-W${bucket.weekNumber}`,
        weekLabel: `${bucket.monthLabel} - Week ${bucket.weekNumber}`,
        subject: avg(bucket.weekdaySubject),
        comp: avg(bucket.weekdayComp),
      },
      {
        label: "Weekend",
        weekKey: `${bucket.monthLabel}-W${bucket.weekNumber}`,
        weekLabel: `${bucket.monthLabel} - Week ${bucket.weekNumber}`,
        subject: avg(bucket.weekendSubject),
        comp: avg(bucket.weekendComp),
      },
    ]);
}

export default async function ReportPresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string; presentationId?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;
  const isDemoMode = demo === "1" || demo === "true";
  /*
    TEMPORARILY DISABLED (commented out for easy restore):
    Presentation-based overrides in present mode.
  */
  // const { presentationId } = await searchParams;
  // const selectedPresentation = presentationId
  //   ? await getPresentationById(presentationId)
  //   : null;
  // const presentationForReport =
  //   selectedPresentation && selectedPresentation.report.id === id
  //     ? selectedPresentation
  //     : null;
  // const slideTitleOverrides =
  //   (presentationForReport?.slideTitlesJson as Record<string, string> | null) ??
  //   {};

  const rawViewModel = await buildReportViewModel(id);
  const cookieStore = await cookies();
  const persistedComps = cookieStore.get(`present_comps_${id}`)?.value ?? "";
  const selectedCompIds = new Set(
    persistedComps
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const availableCompMembers = rawViewModel.compSet.members.filter(
    (m) => m.roleType === "COMP",
  );
  const appliedCompIds =
    selectedCompIds.size > 0
      ? availableCompMembers
          .map((m) => m.id)
          .filter((id) => selectedCompIds.has(id))
      : availableCompMembers.map((m) => m.id);

  let viewModel: ReportViewModel = rawViewModel;
  if (appliedCompIds.length && rawViewModel.comparisonDataset) {
    const allowedHotelIds = new Set([
      rawViewModel.subjectHotel.id,
      ...appliedCompIds,
    ]);
    const filteredMembers = rawViewModel.compSet.members.filter(
      (m) => m.roleType === "SUBJECT" || allowedHotelIds.has(m.id),
    );
    const filteredObservations = rawViewModel.comparisonDataset.observations
      .filter((row) => allowedHotelIds.has(row.hotelId))
      .map((row) => ({
        hotelId: row.hotelId,
        hotelName: row.hotelName,
        roleType:
          row.hotelId === rawViewModel.subjectHotel.id
            ? ("SUBJECT" as const)
            : ("COMP" as const),
        stayDate: new Date(row.stayDate),
        captureDate: new Date(row.captureDate),
        nightlyRate: row.nightlyRate,
        currency: row.currency,
        availabilityStatus: row.availabilityStatus ?? null,
        roomType: row.roomType ?? null,
      })) as AnalyticsObservation[];
    const filteredAnalytics = computeRateAnalytics(
      filteredObservations,
      rawViewModel.subjectHotel.id,
      90,
    );

    const lines = filteredMembers.map((m) => ({
      hotelId: m.id,
      hotelName: m.name,
      roleType: m.roleType,
    }));
    const points = filteredAnalytics.daily.map((day) => {
      const point: { date: string } & Record<string, number | string | null> = {
        date: day.date,
      };
      for (const line of lines) {
        const obs = filteredObservations
          .filter(
            (o) =>
              o.hotelId === line.hotelId &&
              o.stayDate.toISOString().slice(0, 10) === day.date,
          )
          .sort((a, b) => b.captureDate.getTime() - a.captureDate.getTime())[0];
        point[line.hotelId] = obs?.nightlyRate ?? null;
      }
      return point;
    });

    viewModel = {
      ...rawViewModel,
      compSet: { ...rawViewModel.compSet, members: filteredMembers },
      analytics: filteredAnalytics,
      hotelRateSeries: { points, lines },
      comparisonDataset: {
        ...rawViewModel.comparisonDataset,
        observations: rawViewModel.comparisonDataset.observations.filter(
          (row) => allowedHotelIds.has(row.hotelId),
        ),
        hotels: rawViewModel.comparisonDataset.hotels.filter((row) =>
          allowedHotelIds.has(row.id),
        ),
      },
      reviewSnapshots: rawViewModel.reviewSnapshots
        ? {
            subject: rawViewModel.reviewSnapshots.subject,
            comps: rawViewModel.reviewSnapshots.comps.filter((c) =>
              allowedHotelIds.has(c.hotelId),
            ),
          }
        : rawViewModel.reviewSnapshots,
      competitorWebsiteAudits: (
        rawViewModel.competitorWebsiteAudits ?? []
      ).filter((c) => allowedHotelIds.has(c.hotelId)),
    };
  }
  const reportSectionConfig = await prisma.report.findUnique({
    where: { id },
    select: {
      sections: {
        select: { type: true, enabled: true },
      },
    },
  });
  const websiteAuditEnabledInReport =
    reportSectionConfig?.sections.find(
      (section) => section.type === "WEBSITE_AUDIT",
    )?.enabled ?? false;

  // Fetch linked demo session for owner feedback
  const linkedDemo = await prisma.demoSession.findFirst({
    where: {
      OR: [{ reportId: id }, { hotelId: viewModel.subjectHotel.id }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, ownerFeedback: true },
  });
  const summary90 = viewModel.analytics.summariesByWindow["90"];
  const compCount = viewModel.compSet.members.filter(
    (m) => m.roleType === "COMP",
  ).length;
  const hasWebsiteData = viewModel.websiteAudit?.scoreTotal != null;
  const hasSeoData =
    viewModel.includeSeoComparison &&
    (viewModel.websiteAudit?.seoScoreTotal ??
      viewModel.seoAudit?.total ??
      null) != null;

  const competitiveGaps = buildCompetitiveGaps(
    viewModel.analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore: viewModel.includeSeoComparison
        ? (viewModel.websiteAudit?.seoScoreTotal ??
          viewModel.seoAudit?.total ??
          null)
        : null,
      reviewSubject: viewModel.reviewSnapshots?.subject,
      reviewComps: viewModel.reviewSnapshots?.comps,
    },
  );

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

  const weekdayWeekendData = buildWeekwiseWeekdayWeekendData(
    viewModel.analytics.daily,
  );

  const normalizeHotelName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalizedSubjectName = normalizeHotelName(viewModel.subjectHotel.name);
  const subjectOtaRatings: Record<string, number> = {};

  for (const [key, value] of Object.entries(
    viewModel.subjectHotel.otaRatings ?? {},
  )) {
    const num = parseOtaScore(value);
    if (num !== null) subjectOtaRatings[key] = num;
  }

  for (const [key, value] of Object.entries(
    viewModel.compSet.subjectOtaRatings ?? {},
  )) {
    if (subjectOtaRatings[key] === undefined) {
      const num = parseOtaScore(value);
      if (num !== null) subjectOtaRatings[key] = num;
    }
  }

  const otaCompetitors = viewModel.compSet.members
    .filter(
      (member) =>
        member.roleType === "COMP" &&
        normalizeHotelName(member.name) !== normalizedSubjectName,
    )
    .map((member) => {
      const ratings: Record<string, number> = {};
      for (const [key, value] of Object.entries(member.otaRatings ?? {})) {
        const num = parseOtaScore(value);
        if (num !== null) ratings[key] = num;
      }
      return { name: member.name, ratings };
    });

  const subjectLikeComp = viewModel.compSet.members.find(
    (member) =>
      member.roleType === "COMP" &&
      normalizeHotelName(member.name) === normalizedSubjectName,
  );
  if (subjectLikeComp?.otaRatings) {
    for (const [key, value] of Object.entries(subjectLikeComp.otaRatings)) {
      if (subjectOtaRatings[key] === undefined) {
        const num = parseOtaScore(value);
        if (num !== null) subjectOtaRatings[key] = num;
      }
    }
  }

  const otaComparisonData = {
    subjectRatings: subjectOtaRatings,
    competitors: otaCompetitors,
    subjectName: viewModel.subjectHotel.name,
  };
  const reviewResponseScreenshotsByHotel =
    viewModel.comparisonDataset?.reviewResponseScreenshotsByHotel ?? {};
  const reviewResponseHotels = [
    {
      hotelId: viewModel.subjectHotel.id,
      hotelName: viewModel.subjectHotel.name,
      screenshots:
        reviewResponseScreenshotsByHotel[viewModel.subjectHotel.id] ?? [],
    },
  ];

  const abovePct = summary90.nights
    ? Math.round((summary90.aboveThresholdCount / summary90.nights) * 100)
    : 0;
  const belowPct = summary90.nights
    ? Math.round((summary90.belowThresholdCount / summary90.nights) * 100)
    : 0;

  const slides = [
    {
      id: "cover",
      title: "Report Introduction",
      body: (
        <PresentationCoverSlide
          title={
            viewModel.reportName
          }
          hotelName={viewModel.subjectHotel.name}
          city={viewModel.subjectHotel.city}
          country={viewModel.subjectHotel.country}
          compHotelNames={viewModel.compSet.members
            .filter((member) => member.roleType === "COMP")
            .map((member) => member.name)}
        />
      ),
      takeaway:
        "This deck translates the existing report data into an executive narrative with one decision-oriented message per slide.",
    },
    {
      id: "competitorSelection",
      title: "Select Competitor Hotels",
      body: (
        <form
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            method="post"
            action="/api/presentation-selection"
          >
            <input type="hidden" name="reportId" value={id} />
            {demo ? <input type="hidden" name="demo" value={demo} /> : null}
            <p className="text-sm font-semibold text-slate-800">
              Select Competitor Hotels
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {availableCompMembers.map((member) => {
                const checked = appliedCompIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="comps"
                      value={member.id}
                      defaultChecked={checked}
                    />
                    <span>{member.name}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="submit"
              className="mt-4 inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white"
            >
              Apply Selection
            </button>
          </form>
      ),
      takeaway:
        "Select competitor context live during the meeting. This choice is intentionally never saved to presentation templates.",
    },
    {
      id: "summary",
      title: "Executive Summary",
      body: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-700">
                Avg Subject Rate
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(summary90.avgSubjectRate)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Avg Comp Rate
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(summary90.avgCompAverageRate)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Rate Index
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatNumber(summary90.avgRateIndex, 2)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Median Gap
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatCurrency(summary90.medianGap)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700">
              Observed pricing and digital performance indicate a measurable
              positioning gap, with clear opportunities across rate strategy and
              direct demand conversion.
            </p>
          </div>
        </div>
      ),
      takeaway: `The subject sits below comp average on ${belowPct}% of observed nights, signaling a consistent value-positioning posture.`,
    },
    {
      id: "pricingTrends",
      title: "Hotel-by-Hotel Rate Comparison",
      body: (
        <RateTrendPanels
          ratePositionData={viewModel.analytics.daily}
          hotelRateData={viewModel.hotelRateSeries?.points ?? []}
          hotelRateLines={viewModel.hotelRateSeries?.lines ?? []}
          mode="hotel-only"
        />
      ),
      takeaway:
        "Trend lines show whether pricing gaps are episodic or structural, helping prioritize tactical versus systemic response.",
    },
    {
      id: "compSnapshot",
      title: "Competitive Gap Snapshot",
      body: (
        <div className="space-y-5">
          <CompetitiveGapsGrid gaps={visibleCompetitiveGaps} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Main Property:{" "}
            <span className="font-semibold text-blue-700">
              {viewModel.subjectHotel.name}
            </span>{" "}
            compared against <span className="font-semibold">{compCount}</span>{" "}
            competitors in {viewModel.compSet.name}.
          </div>
        </div>
      ),
      takeaway:
        "The snapshot isolates the most visible performance gaps so leadership can focus on high-impact fixes first.",
    },
    {
      id: "mixAndRank",
      title: "Weekday/Weekend and Rating Distribution",
      body: (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-sky-100 bg-white p-4 md:p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900">
                Weekday vs Weekend Positioning
              </p>
              <p className="text-xs text-slate-500">
                A simplified split so pricing behavior is easier to read at a
                glance.
              </p>
            </div>
            <WeekdayWeekendChart data={weekdayWeekendData} />
          </div>

          <div className="rounded-2xl border border-sky-100 bg-white p-4 md:p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900">
                Subject Rank Distribution
              </p>
              <p className="text-xs text-slate-500">
                How often the subject appears lowest, middle, highest, or
                missing across observed dates.
              </p>
            </div>
            <RankDistributionChart
              distribution={viewModel.analytics.rankDistribution}
            />
          </div>
        </div>
      ),
      takeaway:
        "Segment and distribution views reveal when the subject competes effectively and where positioning consistency breaks down.",
    },
    ...(websiteAuditEnabledInReport
      ? [
          {
            id: "website",
            title: "Website Audit Signals",
            body: <WebsiteScoreCards audit={viewModel.websiteAudit} />,
            takeaway:
              "Digital experience signals complement pricing insights by showing how effectively direct demand can be captured.",
          },
        ]
      : []),
    {
      id: "ota",
      title: "OTA Reputation Comparison",
      body: <OtaRatingComparisonChart data={otaComparisonData} />,
      takeaway:
        "Platform-level reputation pressure indicates where guest perception may be influencing competitive conversion outcomes.",
    },
    {
      id: "reviewResponses",
      title: "Review Response Evidence",
      body: (
        <div className="pr-1">
          <ReviewResponseGallery hotels={reviewResponseHotels} />
        </div>
      ),
      takeaway:
        "Response screenshots show where engagement is visible and where response presence is missing by platform.",
    },
    {
      id: "ownerFeedback",
      title: "Owner Feedback",
      body: (
        <OwnerFeedbackSlide
          reportId={id}
          demoId={linkedDemo?.id ?? null}
          initialFeedback={linkedDemo?.ownerFeedback ?? null}
          hotelName={viewModel.subjectHotel.name}
        />
      ),
      takeaway:
        "Capture the hotel owner's reaction, objections, and next steps directly from the presentation.",
    },
  ];

  const slidesWithNotes = slides.map((slide) => ({
    ...slide,
    talkingPoint: talkingPoints[slide.id] ?? "",
  }));

  return (
    <PresentationRuntime
      slides={slidesWithNotes}
      demoMode={isDemoMode}
      reportId={id}
      demoQuery={demo}
      defaultReportTitle={viewModel.reportName}
      // Temporarily disabled editable presentation mode.
      editor={null}
    />
  );
}
