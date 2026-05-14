import { prisma } from "@/lib/prisma";
import type { ReportViewModel } from "@/lib/reports/sections";

export type AlertMetric = "RATE_GAP" | "WEBSITE_SCORE" | "REVIEW_RANK" | "SEO_SCORE";

export async function evaluateAlerts(reportId: string, viewModel: ReportViewModel) {
  await prisma.alert.deleteMany({
    where: {
      reportId,
      acknowledgedAt: null,
    },
  });

  const alerts: Array<{ metric: AlertMetric; message: string; severity: "INFO" | "WARNING" | "CRITICAL" }> = [];
  const summary90 = viewModel.analytics.summariesByWindow["90"];
  const compCount = viewModel.compSet.members.filter((m) => m.roleType === "COMP").length;
  const totalHotels = compCount + 1;

  if (summary90.avgRateIndex < 0.95) {
    alerts.push({
      metric: "RATE_GAP",
      message: `You're underpricing vs comps—rate index ${summary90.avgRateIndex.toFixed(2)}. Leaving revenue on the table.`,
      severity: "WARNING",
    });
  }

  const websiteScore = viewModel.websiteAudit?.scoreTotal;
  if (websiteScore != null && websiteScore < 70) {
    alerts.push({
      metric: "WEBSITE_SCORE",
      message: `Website score ${websiteScore}/100—guests are bouncing to competitors.`,
      severity: websiteScore < 50 ? "CRITICAL" : "WARNING",
    });
  }

  const seoEnabledForReport = viewModel.includeSeoComparison !== false;
  const seoScore = viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total;
  if (seoEnabledForReport && seoScore != null && seoScore < 60) {
    alerts.push({
      metric: "SEO_SCORE",
      message: `SEO score ${seoScore}/100—your site is invisible where comps rank.`,
      severity: "WARNING",
    });
  }

  const subjectReviews = viewModel.reviewSnapshots?.subject ?? [];
  const compReviews = viewModel.reviewSnapshots?.comps ?? [];
  if (subjectReviews.length && compReviews.some((c) => c.snapshots.length)) {
    const subjAvg = subjectReviews.reduce((a, s) => a + s.averageRating, 0) / subjectReviews.length;
    const compAvgs = compReviews
      .filter((c) => c.snapshots.length)
      .map((c) => c.snapshots.reduce((a, s) => a + s.averageRating, 0) / c.snapshots.length);
    const allScores = [subjAvg, ...compAvgs].sort((a, b) => b - a);
    const rank = allScores.indexOf(subjAvg) + 1;
    if (rank > Math.ceil(totalHotels / 2)) {
      alerts.push({
        metric: "REVIEW_RANK",
        message: `You're #${rank} of ${totalHotels} on review scores—comps are winning the consideration phase.`,
        severity: "WARNING",
      });
    }
  }

  for (const a of alerts) {
    await prisma.alert.create({
      data: {
        reportId,
        hotelId: viewModel.subjectHotel.id,
        metric: a.metric,
        message: a.message,
        severity: a.severity,
      },
    });
  }

  return alerts;
}

export async function getActiveAlerts(options?: { hotelId?: string; reportId?: string }) {
  return prisma.alert.findMany({
    where: {
      acknowledgedAt: null,
      ...(options?.hotelId && { hotelId: options.hotelId }),
      ...(options?.reportId && { reportId: options.reportId }),
    },
    orderBy: { firedAt: "desc" },
    take: 20,
  });
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { acknowledgedAt: new Date(), acknowledgedById: userId },
  });
}
