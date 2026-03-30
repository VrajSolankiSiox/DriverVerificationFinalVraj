import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportBuilderForm } from "@/components/forms/report-builder-form";
import { AlertBanner } from "@/components/reports/alert-banner";
import { ExportButtons } from "@/components/reports/export-buttons";
import { GapHeatmap } from "@/components/reports/gap-heatmap";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import { RankDistributionChart } from "@/components/reports/rank-distribution-chart";
import { RateIndexChart } from "@/components/reports/rate-index-chart";
import { RatePositioningChart } from "@/components/reports/rate-positioning-chart";
import { ReportStatusControls } from "@/components/reports/report-status-controls";
import { WeekdayWeekendChart } from "@/components/reports/weekday-weekend-chart";
import { WebsiteScoreCards } from "@/components/reports/website-score-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildReportViewModel, getReport } from "@/lib/services/reports";
import { getActiveAlerts } from "@/lib/services/alerts";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    notFound();
  }
  const [viewModel, alerts] = await Promise.all([
    buildReportViewModel(id),
    getActiveAlerts({ reportId: id }),
  ]);
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

  return (
    <div className="space-y-6">
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge>{report.status}</Badge>
            <Badge className="bg-blue-100 text-blue-800">Confidence {viewModel.confidenceLevel}</Badge>
          </div>
          <h1 className="text-2xl font-semibold">{report.name}</h1>
          <p className="text-sm text-muted-foreground">{report.subjectHotel.name} • {report.compSet.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href={`/reports/${report.id}/present`}>Presentation mode</Link></Button>
          <Button asChild variant="outline"><Link href={`/reports/${report.id}/present?demo=1`}>Demo mode (speaker notes)</Link></Button>
          <Button asChild variant="outline"><Link href={`/reports/${report.id}/print`}>Print view</Link></Button>
          <ReportStatusControls reportId={report.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Subject Rate</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{formatCurrency(summary90.avgSubjectRate)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Comp Average</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{formatCurrency(summary90.avgCompAverageRate)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Rate Index</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{formatNumber(summary90.avgRateIndex, 2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Median Gap</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{formatCurrency(summary90.medianGap)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Where You&apos;re Losing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {competitiveGaps.map((g) => (
              <div
                key={g.metric}
                className={`rounded-lg border p-4 ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "border-amber-300 bg-amber-50" : ""}`}
              >
                <div className="text-sm font-medium text-slate-500">{g.metric}</div>
                <div className="mt-1 text-xl font-semibold">{g.subjectValue}</div>
                {g.compAverage != null && <div className="text-sm text-slate-600">vs {g.compAverage}</div>}
                {g.rank != null && <div className="text-sm text-slate-600">{g.rank}</div>}
                <div className={`mt-2 text-sm font-medium ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "text-amber-700" : "text-slate-700"}`}>{g.verdict}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>90-Day rate comparison</CardTitle></CardHeader>
          <CardContent><RatePositioningChart data={viewModel.analytics.daily} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rate index over time</CardTitle></CardHeader>
          <CardContent><RateIndexChart data={viewModel.analytics.daily.map((row) => ({ date: row.date, rateIndex: row.rateIndex }))} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Weekday vs weekend positioning</CardTitle></CardHeader>
          <CardContent><WeekdayWeekendChart data={weekdayWeekendData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Subject rank distribution</CardTitle></CardHeader>
          <CardContent><RankDistributionChart distribution={viewModel.analytics.rankDistribution} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Daily gap heatmap</CardTitle></CardHeader>
        <CardContent><GapHeatmap rows={viewModel.analytics.daily.map((row) => ({ date: row.date, gapToCompAverage: row.gapToCompAverage }))} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website audit findings</CardTitle></CardHeader>
        <CardContent><WebsiteScoreCards audit={viewModel.websiteAudit} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Report builder</CardTitle></CardHeader>
        <CardContent>
          <ReportBuilderForm
            report={{
              id: report.id,
              executiveSummary: report.executiveSummary,
              manualOpportunityNotes: report.manualOpportunityNotes,
              methodologyNote: report.methodologyNote,
              status: report.status,
              sections: report.sections.map((section) => ({
                id: section.id,
                title: section.title,
                displayOrder: section.displayOrder,
                enabled: section.enabled,
                visibility: section.visibility,
              })),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Exports</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ExportButtons reportId={report.id} />
          <ul className="space-y-2 text-sm">
            {report.exports.map((artifact) => (
              <li key={artifact.id}>
                {artifact.type} • {artifact.visibility} • {artifact.status}
                {artifact.status === "SUCCESS" ? (
                  <Link className="ml-2" href={`/api/exports/${artifact.id}/download`}>Download</Link>
                ) : null}
                {artifact.errorMessage ? <span className="ml-2 text-destructive">{artifact.errorMessage}</span> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
