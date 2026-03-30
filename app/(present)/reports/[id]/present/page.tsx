import { PresentationView } from "@/components/reports/presentation-view";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import { buildReportViewModel } from "@/lib/services/reports";
import { formatCurrency, formatNumber } from "@/lib/utils";

const talkingPoints: Record<string, string> = {
  cover: "Introduce the report. Internal analysis for client-safe presentation.",
  summary: "Lead with the rate metrics. You're $X below comps—that's measurable revenue left on the table.",
  gaps: "Here's where you're losing. Let's dig in. Lead with the strongest gap.",
  compset: "This is your compset. We compare you against these properties.",
  pricing: "You're underpricing on X nights. Comps are capturing more. What's your strategy?",
  website: "Your site scores X vs comps at 85. Guests are bouncing to competitors.",
  actions: "Here's what to do first. We can help operationalize.",
  methodology: "This is outside-in observation, not a revenue claim. Close with: What's the one thing you'd fix first?",
};

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
  const summary90 = viewModel.analytics.summariesByWindow["90"];
  const compCount = viewModel.compSet.members.filter((m) => m.roleType === "COMP").length;
  const competitiveGaps = buildCompetitiveGaps(
    viewModel.analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore: viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null,
      reviewSubject: viewModel.reviewSnapshots?.subject,
      reviewComps: viewModel.reviewSnapshots?.comps,
    },
  );

  const slides = [
    {
      id: "cover",
      title: "Cover",
      body: (
        <div className="flex h-full flex-col justify-center">
          <h1 className="text-5xl font-semibold tracking-tight">{viewModel.reportName}</h1>
          <p className="mt-4 text-2xl text-slate-600">{viewModel.subjectHotel.name} • {viewModel.subjectHotel.city}, {viewModel.subjectHotel.country}</p>
          <p className="mt-6 max-w-3xl text-lg text-slate-500">Internal analysis assembled for client-safe presentation. Publicly observed rates and first-party website data only.</p>
        </div>
      ),
    },
    {
      id: "summary",
      title: "Executive Summary",
      body: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Avg Subject Rate</div><div className="mt-2 text-3xl font-semibold">{formatCurrency(summary90.avgSubjectRate)}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Avg Comp Average</div><div className="mt-2 text-3xl font-semibold">{formatCurrency(summary90.avgCompAverageRate)}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Rate Index</div><div className="mt-2 text-3xl font-semibold">{formatNumber(summary90.avgRateIndex, 2)}</div></div>
          </div>
          <p className="max-w-4xl text-lg text-slate-700">{viewModel.manualExecutiveSummary ?? "Publicly observed rate positioning suggests a meaningful commercial conversation around pricing stance, website merchandising, and direct booking conversion."}</p>
        </div>
      ),
    },
    {
      id: "gaps",
      title: "Where You're Losing",
      body: (
        <div className="space-y-4">
          <p className="text-lg text-slate-600">Competitive gaps across rate, website, reviews, and SEO.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {competitiveGaps.map((g) => (
              <div
                key={g.metric}
                className={`rounded-xl border p-5 ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
              >
                <div className="text-sm uppercase tracking-wide text-slate-500">{g.metric}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">{g.subjectValue}</span>
                  {g.compAverage != null && <span className="text-slate-600">vs {g.compAverage}</span>}
                </div>
                {g.rank != null && <div className="mt-1 text-sm text-slate-600">{g.rank}</div>}
                <div className={`mt-2 font-medium ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "text-amber-700" : "text-slate-700"}`}>{g.verdict}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "compset",
      title: "CompSet Overview",
      body: (
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold">{viewModel.compSet.name}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {viewModel.compSet.members.map((member) => (
              <div key={member.id} className="rounded-xl border p-5">
                <div className="text-sm uppercase tracking-wide text-slate-500">{member.roleType}</div>
                <div className="mt-2 text-2xl font-semibold">{member.name}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "pricing",
      title: "Pricing Positioning",
      body: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Below Comp Avg</div><div className="mt-2 text-4xl font-semibold">{summary90.belowThresholdCount}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Above Comp Avg</div><div className="mt-2 text-4xl font-semibold">{summary90.aboveThresholdCount}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Lowest-Priced Nights</div><div className="mt-2 text-4xl font-semibold">{summary90.subjectLowestCount}</div></div>
          </div>
          <div className="rounded-xl border p-6">
            <h3 className="text-xl font-semibold">Key interpretation</h3>
            <p className="mt-3 text-lg text-slate-700">Across the observed 90-day window, the subject property priced below the compset average on {summary90.belowThresholdCount} of {summary90.nights} nights. This is framed as an outside-in pricing observation, not a revenue or occupancy claim.</p>
          </div>
        </div>
      ),
    },
    {
      id: "website",
      title: "Website Audit",
      body: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Total Score</div><div className="mt-2 text-4xl font-semibold">{viewModel.websiteAudit?.scoreTotal ?? "—"}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Direct Booking UX</div><div className="mt-2 text-4xl font-semibold">{viewModel.websiteAudit?.directBookingUxScore ?? "—"}</div></div>
            <div className="rounded-xl border p-6"><div className="text-sm text-slate-500">Technical Hygiene</div><div className="mt-2 text-4xl font-semibold">{viewModel.websiteAudit?.technicalHygieneScore ?? "—"}</div></div>
          </div>
          <ul className="list-disc space-y-2 pl-6 text-lg text-slate-700">
            {(viewModel.websiteAudit?.notes ?? ["Website audit has not been run yet."]).map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      ),
    },
    {
      id: "actions",
      title: "Recommended Actions",
      body: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-6"><h3 className="text-2xl font-semibold">30 Days</h3><ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700"><li>Validate low-position pricing guardrails.</li><li>Tighten booking CTA placement.</li><li>Expose commercial offers more clearly.</li></ul></div>
          <div className="rounded-xl border p-6"><h3 className="text-2xl font-semibold">60 Days</h3><ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700"><li>Refine weekday vs weekend merchandising.</li><li>Formalize near-term market review cadence.</li><li>Close technical hygiene gaps.</li></ul></div>
          <div className="rounded-xl border p-6"><h3 className="text-2xl font-semibold">90 Days</h3><ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700"><li>Operationalize cross-functional workflow.</li><li>Track conversion lift.</li><li>Increase observation granularity.</li></ul></div>
        </div>
      ),
    },
    {
      id: "methodology",
      title: "Methodology",
      body: (
        <div className="max-w-4xl space-y-4 text-lg text-slate-700">
          <p>{viewModel.methodologyNote}</p>
          <p>This analysis does not claim actual hotel revenue, occupancy, or market share. It summarizes uploaded market observations and first-party website signals available at the time of analysis.</p>
        </div>
      ),
    },
  ];

  const slidesWithNotes = slides.map((s) => ({
    ...s,
    talkingPoint: talkingPoints[s.id] ?? "",
  }));

  return <PresentationView slides={slidesWithNotes} demoMode={isDemoMode} />;
}
