import { CompetitiveGapsGrid } from "@/components/reports/competitive-gaps-grid";
import { OtaRatingComparisonChart } from "@/components/reports/ota-rating-comparison-chart";
import { OwnerFeedbackSlide } from "@/components/reports/owner-feedback-slide";
import { PresentationView } from "@/components/reports/presentation-view";
import { RankDistributionChart } from "@/components/reports/rank-distribution-chart";
import { RateIndexChart } from "@/components/reports/rate-index-chart";
import { ReviewResponseGallery } from "@/components/reports/review-response-gallery";
import { RateTrendPanels } from "@/components/reports/rate-trend-panels";
import { WeekdayWeekendChart } from "@/components/reports/weekday-weekend-chart";
import { WebsiteScoreCards } from "@/components/reports/website-score-cards";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import { buildReportViewModel } from "@/lib/services/reports";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";

const talkingPoints: Record<string, string> = {
  cover: "Frame the narrative: this is an outside-in competitive read, not an internal revenue claim.",
  summary: "Open with the biggest deltas and show how pricing posture compares with the market.",
  pricingTrends: "Show whether under- or over-positioning is persistent and where competitors separate.",
  rateIndex: "Use rate index to explain premium versus discount posture through time.",
  compSnapshot: "Highlight where the subject wins and where visible gaps require action.",
  mixAndRank: "Use these distributions to explain how often the subject truly leads or trails.",
  website: "Connect website quality to rate and conversion narrative.",
  ota: "Show platform-by-platform reputation pressure versus competitors.",
  reviewResponses: "Use visual proof of response activity to support the reputation management narrative.",
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

export default async function ReportPresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;
  const isDemoMode = demo === "1" || demo === "true";

  const viewModel = await buildReportViewModel(id);

  // Fetch linked demo session for owner feedback
  const linkedDemo = await prisma.demoSession.findFirst({
    where: {
      OR: [
        { reportId: id },
        { hotelId: viewModel.subjectHotel.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, ownerFeedback: true },
  });
  const summary90 = viewModel.analytics.summariesByWindow["90"];
  const compCount = viewModel.compSet.members.filter((m) => m.roleType === "COMP").length;
  const hasWebsiteData = viewModel.websiteAudit?.scoreTotal != null;
  const hasSeoData =
    viewModel.includeSeoComparison &&
    (viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null) != null;

  const competitiveGaps = buildCompetitiveGaps(
    viewModel.analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore: viewModel.includeSeoComparison
        ? (viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null)
        : null,
      reviewSubject: viewModel.reviewSnapshots?.subject,
      reviewComps: viewModel.reviewSnapshots?.comps,
    },
  );

  const visibleCompetitiveGaps = competitiveGaps.filter((gap) => {
    if (gap.metric === "Website score" && (!hasWebsiteData || !viewModel.includeSeoComparison)) {
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
      subject: viewModel.analytics.weekdayWeekend.weekdaySubjectAverage,
      comp: viewModel.analytics.weekdayWeekend.weekdayCompAverage,
    },
    {
      label: "Weekend",
      subject: viewModel.analytics.weekdayWeekend.weekendSubjectAverage,
      comp: viewModel.analytics.weekdayWeekend.weekendCompAverage,
    },
  ];

  const normalizeHotelName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const normalizedSubjectName = normalizeHotelName(viewModel.subjectHotel.name);
  const subjectOtaRatings: Record<string, number> = {};

  for (const [key, value] of Object.entries(viewModel.subjectHotel.otaRatings ?? {})) {
    const num = parseOtaScore(value);
    if (num !== null) subjectOtaRatings[key] = num;
  }

  for (const [key, value] of Object.entries(viewModel.compSet.subjectOtaRatings ?? {})) {
    if (subjectOtaRatings[key] === undefined) {
      const num = parseOtaScore(value);
      if (num !== null) subjectOtaRatings[key] = num;
    }
  }

  const otaCompetitors = viewModel.compSet.members
    .filter((member) => member.roleType === "COMP" && normalizeHotelName(member.name) !== normalizedSubjectName)
    .map((member) => {
      const ratings: Record<string, number> = {};
      for (const [key, value] of Object.entries(member.otaRatings ?? {})) {
        const num = parseOtaScore(value);
        if (num !== null) ratings[key] = num;
      }
      return { name: member.name, ratings };
    });

  const subjectLikeComp = viewModel.compSet.members.find(
    (member) => member.roleType === "COMP" && normalizeHotelName(member.name) === normalizedSubjectName,
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
  const reviewResponseScreenshotsByHotel = viewModel.comparisonDataset?.reviewResponseScreenshotsByHotel ?? {};
  const reviewResponseHotels = [
    {
      hotelId: viewModel.subjectHotel.id,
      hotelName: viewModel.subjectHotel.name,
      screenshots: reviewResponseScreenshotsByHotel[viewModel.subjectHotel.id] ?? [],
    },
  ];

  const abovePct = summary90.nights ? Math.round((summary90.aboveThresholdCount / summary90.nights) * 100) : 0;
  const belowPct = summary90.nights ? Math.round((summary90.belowThresholdCount / summary90.nights) * 100) : 0;

  const slides = [
    {
      id: "cover",
      title: "Report Introduction",
      body: (
        <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Premium Presentation
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">{viewModel.reportName}</h1>
            <p className="text-lg text-slate-700">{viewModel.subjectHotel.name} | {viewModel.subjectHotel.city}, {viewModel.subjectHotel.country}</p>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Executive-ready competitive analysis based on observed market rates and first-party digital signals.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Story Focus</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Rate posture vs compset across observed dates</li>
              <li>Where the subject consistently wins or lags</li>
              <li>Website and OTA pressure points shaping demand choice</li>
              <li>Prioritized 30/60/90 day commercial actions</li>
            </ul>
          </div>
        </div>
      ),
      takeaway: "This deck translates the existing report data into an executive narrative with one decision-oriented message per slide.",
    },
    {
      id: "summary",
      title: "Executive Summary",
      body: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-700">Avg Subject Rate</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(summary90.avgSubjectRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Avg Comp Rate</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(summary90.avgCompAverageRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rate Index</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatNumber(summary90.avgRateIndex, 2)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Median Gap</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(summary90.medianGap)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-7 text-slate-700">
              Observed pricing and digital performance indicate a measurable positioning gap, with clear opportunities across rate strategy and direct demand conversion.
            </p>
          </div>
        </div>
      ),
      takeaway: `The subject sits below comp average on ${belowPct}% of observed nights, signaling a consistent value-positioning posture.`,
    },
    {
      id: "pricingTrends",
      title: "Rate Trend and Competitor Comparison",
      body: (
        <RateTrendPanels
          ratePositionData={viewModel.analytics.daily}
          hotelRateData={viewModel.hotelRateSeries?.points ?? []}
          hotelRateLines={viewModel.hotelRateSeries?.lines ?? []}
        />
      ),
      takeaway: "Trend lines show whether pricing gaps are episodic or structural, helping prioritize tactical versus systemic response.",
    },
    {
      id: "rateIndex",
      title: "Rate Index Performance",
      body: (
        <div className="space-y-6">
          <RateIndexChart
            data={viewModel.analytics.daily.map((row) => ({
              date: row.date,
              rateIndex: row.rateIndex,
            }))}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Below Comp Avg Nights</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{summary90.belowThresholdCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Above Comp Avg Nights</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{summary90.aboveThresholdCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Lowest-Priced Nights</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{summary90.subjectLowestCount}</p>
            </div>
          </div>
        </div>
      ),
      takeaway: `The subject is above comp average on ${abovePct}% of nights, showing limited premium positioning periods.`,
    },
    {
      id: "compSnapshot",
      title: "Competitive Gap Snapshot",
      body: (
        <div className="space-y-5">
          <CompetitiveGapsGrid gaps={visibleCompetitiveGaps} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Subject hotel: <span className="font-semibold text-blue-700">{viewModel.subjectHotel.name}</span> compared against <span className="font-semibold">{compCount}</span> competitors in {viewModel.compSet.name}.
          </div>
        </div>
      ),
      takeaway: "The snapshot isolates the most visible performance gaps so leadership can focus on high-impact fixes first.",
    },
    {
      id: "mixAndRank",
      title: "Weekday/Weekend and Rating Distribution",
      body: (
        <div className="grid gap-6 xl:grid-cols-2">
          <WeekdayWeekendChart data={weekdayWeekendData} />
          <RankDistributionChart distribution={viewModel.analytics.rankDistribution} />
        </div>
      ),
      takeaway: "Segment and distribution views reveal when the subject competes effectively and where positioning consistency breaks down.",
    },
    {
      id: "website",
      title: "Website Audit Signals",
      body: <WebsiteScoreCards audit={viewModel.websiteAudit} />,
      takeaway: "Digital experience signals complement pricing insights by showing how effectively direct demand can be captured.",
    },
    {
      id: "ota",
      title: "OTA Reputation Comparison",
      body: <OtaRatingComparisonChart data={otaComparisonData} />,
      takeaway: "Platform-level reputation pressure indicates where guest perception may be influencing competitive conversion outcomes.",
    },
    {
      id: "reviewResponses",
      title: "Review Response Evidence",
      body: <ReviewResponseGallery hotels={reviewResponseHotels} />,
      takeaway: "Response screenshots show where engagement is visible and where response presence is missing by platform.",
    },
    {
      id: "actions",
      title: "Prioritized Action Plan",
      body: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">30 Days</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Recalibrate low-position guardrails on high-demand nights.</li>
              <li>Strengthen booking CTA visibility on primary pages.</li>
              <li>Align visible offers with key comp pressure windows.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">60 Days</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Tune weekday/weekend merchandising by observed pattern.</li>
              <li>Formalize weekly compset pricing review cadence.</li>
              <li>Resolve core website technical hygiene issues.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">90 Days</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>Integrate commercial, marketing, and digital workflows.</li>
              <li>Track conversion movement against pricing changes.</li>
              <li>Increase market observation depth where variance is highest.</li>
            </ul>
          </div>
        </div>
      ),
      takeaway: "A phased action plan turns observed gaps into an operational roadmap with immediate and medium-term wins.",
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
      takeaway: "Capture the hotel owner's reaction, objections, and next steps directly from the presentation.",
    },
  ];

  const slidesWithNotes = slides.map((slide) => ({
    ...slide,
    talkingPoint: talkingPoints[slide.id] ?? "",
  }));

  return <PresentationView slides={slidesWithNotes} demoMode={isDemoMode} />;
}
