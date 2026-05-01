import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportBuilderForm } from "@/components/forms/report-builder-form";
import { AlertBanner } from "@/components/reports/alert-banner";
import { ExportButtons } from "@/components/reports/export-buttons";
import { GapHeatmap } from "@/components/reports/gap-heatmap";
import { HotelRateComparisonChart } from "@/components/reports/hotel-rate-comparison-chart";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import { RankDistributionChart } from "@/components/reports/rank-distribution-chart";
import { RateIndexChart } from "@/components/reports/rate-index-chart";
import { RatePositioningChart } from "@/components/reports/rate-positioning-chart";
import { ReportStatusControls } from "@/components/reports/report-status-controls";
import { WeekdayWeekendChart } from "@/components/reports/weekday-weekend-chart";
import { WebsiteScoreCards } from "@/components/reports/website-score-cards";
import { OtaRatingComparisonChart } from "@/components/reports/ota-rating-comparison-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildReportViewModel, getReport } from "@/lib/services/reports";
import { getActiveAlerts } from "@/lib/services/alerts";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const subjectObservedNights =
    viewModel.dataQuality?.subjectObservedNights ??
    viewModel.analytics.daily.filter((row) => row.subjectRate !== null).length;
  const nightsWithCompData =
    viewModel.dataQuality?.nightsWithCompData ??
    viewModel.analytics.daily.filter((row) => row.compCount > 0).length;
  const suspiciousSubjectRows =
    viewModel.dataQuality?.suspiciousSubjectRows ?? 0;
  const subjectSourceNames = viewModel.dataQuality?.subjectSourceNames ?? [];
  const missingCompSetHotelsInData =
    viewModel.dataQuality?.missingCompSetHotelsInData ?? [];
  const showDataQualityWarning =
    subjectObservedNights === 0 ||
    suspiciousSubjectRows > 0 ||
    missingCompSetHotelsInData.length > 0;
  const compCount = viewModel.compSet.members.filter(
    (m) => m.roleType === "COMP",
  ).length;
  const competitiveGaps = buildCompetitiveGaps(
    viewModel.analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore:
        viewModel.websiteAudit?.seoScoreTotal ??
        viewModel.seoAudit?.total ??
        null,
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
  const subjectHotelId = viewModel.subjectHotel.id;
  const normalizeHotelName = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedSubjectName = normalizeHotelName(viewModel.subjectHotel.name);

  const rawCompMembersWithExpedia = viewModel.compSet.members
    .filter((member) => member.id !== subjectHotelId)
    .map((member) => ({
      id: member.id,
      name: member.name,
      expediaRating: member.otaRatings?.Expedia,
    }));
  const subjectLikeCompMember = rawCompMembersWithExpedia.find(
    (member) => normalizeHotelName(member.name) === normalizedSubjectName,
  );

  const compMembersWithExpedia = rawCompMembersWithExpedia.filter(
    (member) => normalizeHotelName(member.name) !== normalizedSubjectName,
  );
  const compExpediaRatings = compMembersWithExpedia
    .map((member) => Number(member.expediaRating))
    .filter((value) => Number.isFinite(value));
  const avgCompExpediaRating = compExpediaRatings.length
    ? compExpediaRatings.reduce((sum, value) => sum + value, 0) / compExpediaRatings.length
    : null;
  const subjectExpediaFromHotel = Number(viewModel.subjectHotel.otaRatings?.Expedia);
  const subjectExpediaFromSubjectLikeComp = Number(subjectLikeCompMember?.expediaRating);
  const subjectExpediaFromReviews = viewModel.reviewSnapshots?.subject.find(
    (snapshot) => snapshot.source === "EXPEDIA",
  )?.averageRating;
  const subjectExpediaRating = Number.isFinite(subjectExpediaFromHotel)
    ? subjectExpediaFromHotel
    : Number.isFinite(subjectExpediaFromSubjectLikeComp)
      ? subjectExpediaFromSubjectLikeComp
    : subjectExpediaFromReviews ?? null;
  const otaCompareChartData =
    subjectExpediaRating != null && avgCompExpediaRating != null
      ? [
          { label: "Subject", rating: subjectExpediaRating },
          { label: "CompSet Avg", rating: avgCompExpediaRating },
        ]
      : [];

  return (
    <div className="space-y-6">
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}
      {/* {showDataQualityWarning ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Data quality warning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            {subjectObservedNights === 0 ? (
              <p>
                No subject-hotel observations were found for <strong>{report.subjectHotel.name}</strong> in this report data.
                Subject rate metrics and rate index are not reliable until subject rows are present in upload observations.
              </p>
            ) : null}
            {suspiciousSubjectRows > 0 ? (
              <p>
                {suspiciousSubjectRows} subject rows were imported from different source hotel names
                ({subjectSourceNames.slice(0, 5).join(", ")}). This usually means historical mapping/import mismatch.
              </p>
            ) : null}
            {missingCompSetHotelsInData.length > 0 ? (
              <div>
                <p>
                  These hotels are in the compset but missing in the report data (from uploaded Excel observations):
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {missingCompSetHotelsInData.map((hotelName) => (
                    <li key={hotelName}>{hotelName}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p>
              Subject observed nights: <strong>{subjectObservedNights}</strong> / {viewModel.analytics.daily.length}. Nights with comp data: <strong>{nightsWithCompData}</strong>.
            </p>
          </CardContent>
        </Card>
      ) : null} */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge>{report.status}</Badge>
            <Badge className="bg-blue-100 text-blue-800">
              Confidence {viewModel.confidenceLevel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {report.subjectHotel.name} • {report.compSet.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.uploadBatch ? (
            <span className="self-center text-sm text-muted-foreground">
              Data: {report.uploadBatch.fileName}
            </span>
          ) : null}
          <Button asChild variant="secondary">
            <Link href={`/reports/${report.id}/present`}>
              Presentation mode
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/reports/${report.id}/present?demo=1`}>
              Demo mode (speaker notes)
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/reports/${report.id}/print`}>Print view</Link>
          </Button>
          <ReportStatusControls reportId={report.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Subject Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {formatCurrency(summary90.avgSubjectRate)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Comp Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {formatCurrency(summary90.avgCompAverageRate)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Rate Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {formatNumber(summary90.avgRateIndex, 2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Median Gap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {formatCurrency(summary90.medianGap)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where You&apos;re Losing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {competitiveGaps.map((g) => (
              <div
                key={g.metric}
                className={`rounded-lg border p-4 ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "border-amber-300 bg-amber-50" : ""}`}
              >
                <div className="text-sm font-medium text-slate-500">
                  {g.metric}
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {g.subjectValue}
                </div>
                {g.compAverage != null && (
                  <div className="text-sm text-slate-600">
                    vs {g.compAverage}
                  </div>
                )}
                {g.rank != null && (
                  <div className="text-sm text-slate-600">{g.rank}</div>
                )}
                <div
                  className={`mt-2 text-sm font-medium ${g.verdict.includes("Leaving") || g.verdict.includes("bouncing") ? "text-amber-700" : "text-slate-700"}`}
                >
                  {g.verdict}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>90-Day rate comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <RatePositioningChart data={viewModel.analytics.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hotel-by-hotel rate comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {viewModel.hotelRateSeries &&
            viewModel.hotelRateSeries.lines.length > 0 ? (
              <HotelRateComparisonChart
                data={viewModel.hotelRateSeries.points}
                lines={viewModel.hotelRateSeries.lines}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No hotel-level comparison data available for this report.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate index over time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Rate Index = Subject Rate / CompSet Average on each date. Above 1.00
            means the subject is priced above comps; below 1.00 means below
            comps.
          </p>
          <RateIndexChart
            data={viewModel.analytics.daily.map((row) => ({
              date: row.date,
              rateIndex: row.rateIndex,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekday vs weekend positioning</CardTitle>
          </CardHeader>
          <CardContent>
            <WeekdayWeekendChart data={weekdayWeekendData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subject rank distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RankDistributionChart
              distribution={viewModel.analytics.rankDistribution}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily gap heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <GapHeatmap
            rows={viewModel.analytics.daily.map((row) => ({
              date: row.date,
              gapToCompAverage: row.gapToCompAverage,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Website audit findings</CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteScoreCards audit={viewModel.websiteAudit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OTA Rating Comparison (Expedia)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Subject vs CompSet Expedia rating comparison. CompSet average uses competitors only.
          </p>
          {otaCompareChartData.length > 0 ? (
            <OtaRatingComparisonChart data={otaCompareChartData} />
          ) : null}
          <div className="text-sm">
            <strong>Subject Expedia rating:</strong>{" "}
            {subjectExpediaRating != null ? formatNumber(subjectExpediaRating, 2) : "—"}
          </div>
          <div className="text-sm">
            <strong>CompSet Expedia average:</strong>{" "}
            {avgCompExpediaRating != null ? formatNumber(avgCompExpediaRating, 2) : "—"}
          </div>
          {compMembersWithExpedia.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {compMembersWithExpedia.map((member) => (
                <li key={member.name}>
                  {member.name}:{" "}
                  {member.expediaRating !== undefined && member.expediaRating !== ""
                    ? member.expediaRating
                    : "—"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No competitor ratings available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report builder</CardTitle>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExportButtons reportId={report.id} />
          <ul className="space-y-2 text-sm">
            {report.exports.map((artifact) => (
              <li key={artifact.id}>
                {artifact.type} • {artifact.visibility} • {artifact.status}
                {artifact.status === "SUCCESS" ? (
                  <Link
                    className="ml-2"
                    href={`/api/exports/${artifact.id}/download`}
                  >
                    Download
                  </Link>
                ) : null}
                {artifact.errorMessage ? (
                  <span className="ml-2 text-destructive">
                    {artifact.errorMessage}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
