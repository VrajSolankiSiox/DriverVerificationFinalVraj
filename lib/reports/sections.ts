import type { ReportSectionType, SectionVisibility } from "@prisma/client";

import type { RateAnalyticsResult } from "@/lib/analytics/rate-analytics";
import { sectionTitleMap } from "@/lib/constants";
import { buildBattlecard } from "@/lib/reports/battlecard";
import { buildCompetitiveGaps } from "@/lib/reports/competitive-gaps";
import { buildExecutiveSummaryNarrative, buildOpportunityBuckets } from "@/lib/reports/narrative";

export type ReportViewModel = {
  reportId: string;
  reportName: string;
  status: string;
  confidenceLevel: "LOW" | "MODERATE" | "HIGH";
  subjectHotel: {
    id: string;
    name: string;
    brand?: string | null;
    city: string;
    state?: string | null;
    country: string;
    websiteUrl?: string | null;
    roomCount?: number | null;
    starLevel?: number | null;
    otaRatings?: Record<string, string | number>;
  };
  compSet: {
    id: string;
    name: string;
    version: number;
    subjectOtaRatings?: Record<string, string | number>;
    members: Array<{
      id: string;
      name: string;
      roleType: "SUBJECT" | "COMP";
      otaRatings?: Record<string, string | number>;
      roomCount?: number | null;
      starLevel?: number | null;
    }>;
  };
  analytics: RateAnalyticsResult;
  hotelRateSeries?: {
    points: Array<{ date: string } & Record<string, number | string | null>>;
    lines: Array<{
      hotelId: string;
      hotelName: string;
      roleType: "SUBJECT" | "COMP";
    }>;
  };
  dataQuality?: {
    subjectObservedNights: number;
    nightsWithCompData: number;
    suspiciousSubjectRows: number;
    subjectSourceNames: string[];
    missingCompSetHotelsInData?: string[];
  };
  websiteAudit: {
    scoreTotal: number | null;
    directBookingUxScore: number | null;
    contentCompletenessScore: number | null;
    technicalHygieneScore: number | null;
    offerVisibilityScore: number | null;
    trustContactScore: number | null;
    seoScoreTotal?: number | null;
    seoFindings?: string[];
    notes: string[];
  } | null;
  competitorWebsiteAudits?: Array<{
    hotelId: string;
    hotelName: string;
    scoreTotal: number | null;
    seoScoreTotal: number | null;
    capturedAt: string | null;
  }>;
  reviewSnapshots?: {
    subject: Array<{ source: string; averageRating: number; reviewCount: number }>;
    comps: Array<{ hotelId: string; hotelName: string; snapshots: Array<{ source: string; averageRating: number; reviewCount: number }> }>;
  };
  seoAudit?: { total: number; notes: string[] } | null;
  includeSeoComparison?: boolean;
  comparisonDataset?: {
    observations: Array<{
      hotelId: string;
      hotelName: string;
      stayDate: string;
      captureDate: string;
      nightlyRate: number;
      currency: string;
      availabilityStatus?: string | null;
      roomType?: string | null;
    }>;
    hotels: Array<{
      id: string;
      name: string;
      roleType: "SUBJECT" | "COMP";
      otaRatings?: Record<string, string | number>;
      roomCount?: number | null;
      starLevel?: number | null;
    }>;
    reviewSnapshotsByHotel: Record<
      string,
      Array<{ source: string; averageRating: number; reviewCount: number }>
    >;
    reviewResponseScreenshotsByHotel?: Record<
      string,
      Array<{ platform: string; imageDataUrl: string | null; capturedAt: string; presence: "RESPONDED" | "NOT_RESPONDED" | "NO_PRESENCE" | "NO_REVIEW" }>
    >;
  };
};

export type BuiltSection = {
  type: ReportSectionType;
  title: string;
  displayOrder: number;
  visibility: SectionVisibility;
  enabled: boolean;
  content: Record<string, unknown>;
};

export function buildReportSections(viewModel: ReportViewModel): BuiltSection[] {
  const summary = buildExecutiveSummaryNarrative(viewModel.analytics);
  const opportunityBuckets = buildOpportunityBuckets(viewModel.analytics);
  const battlecard = buildBattlecard({
    subjectHotelName: viewModel.subjectHotel.name,
    compNames: viewModel.compSet.members.filter((member) => member.roleType === "COMP").map((member) => member.name),
    analytics: viewModel.analytics,
    websiteAuditScore: viewModel.websiteAudit?.scoreTotal,
  });

  const compCount = viewModel.compSet.members.filter((m) => m.roleType === "COMP").length;
  const hasWebsiteData = viewModel.websiteAudit?.scoreTotal != null;
  const seoEnabled = viewModel.includeSeoComparison !== false;
  const hasSeoData = (viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null) != null;
  const competitiveGaps = buildCompetitiveGaps(
    viewModel.analytics,
    viewModel.websiteAudit?.scoreTotal ?? null,
    compCount,
    {
      seoScore: seoEnabled ? (viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null) : null,
      reviewSubject: viewModel.reviewSnapshots?.subject,
      reviewComps: viewModel.reviewSnapshots?.comps,
    },
  );

  const sections: BuiltSection[] = [
    {
      type: "COVER",
      title: sectionTitleMap.COVER,
      displayOrder: 1,
      visibility: "CLIENT_SAFE",
      enabled: hasWebsiteData,
      content: {
        title: viewModel.reportName,
        subtitle: `${viewModel.subjectHotel.name} • ${viewModel.subjectHotel.city}, ${viewModel.subjectHotel.country}`,
      },
    },
    {
      type: "EXECUTIVE_SUMMARY",
      title: sectionTitleMap.EXECUTIVE_SUMMARY,
      displayOrder: 2,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        text: summary,
      },
    },
    {
      type: "COMPETITIVE_GAP_SUMMARY",
      title: sectionTitleMap.COMPETITIVE_GAP_SUMMARY,
      displayOrder: 3,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: { gaps: competitiveGaps },
    },
    {
      type: "SUBJECT_SNAPSHOT",
      title: sectionTitleMap.SUBJECT_SNAPSHOT,
      displayOrder: 4,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: { subjectHotel: viewModel.subjectHotel },
    },
    {
      type: "COMPSET_OVERVIEW",
      title: sectionTitleMap.COMPSET_OVERVIEW,
      displayOrder: 5,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        name: viewModel.compSet.name,
        version: viewModel.compSet.version,
        members: viewModel.compSet.members,
      },
    },
    {
      type: "RATE_POSITIONING_SUMMARY",
      title: sectionTitleMap.RATE_POSITIONING_SUMMARY,
      displayOrder: 6,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        summary90: viewModel.analytics.summariesByWindow["90"],
      },
    },
    {
      type: "RATE_COMPARISON_90_DAY",
      title: sectionTitleMap.RATE_COMPARISON_90_DAY,
      displayOrder: 7,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        daily: viewModel.analytics.daily,
      },
    },
    {
      type: "WEEKDAY_WEEKEND_POSITIONING",
      title: sectionTitleMap.WEEKDAY_WEEKEND_POSITIONING,
      displayOrder: 8,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        weekdayWeekend: viewModel.analytics.weekdayWeekend,
        rankDistribution: viewModel.analytics.rankDistribution,
      },
    },
    {
      type: "GAP_ANALYSIS",
      title: sectionTitleMap.GAP_ANALYSIS,
      displayOrder: 9,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        outlierNights: viewModel.analytics.outlierNights,
        compressionLikeNights: viewModel.analytics.compressionLikeNights,
      },
    },
    {
      type: "WEBSITE_AUDIT",
      title: sectionTitleMap.WEBSITE_AUDIT,
      displayOrder: 10,
      visibility: "CLIENT_SAFE",
      enabled: hasWebsiteData && seoEnabled,
      content: {
        websiteAudit: viewModel.websiteAudit,
        competitors: viewModel.competitorWebsiteAudits ?? [],
      },
    },
    {
      type: "REVIEW_SNAPSHOT",
      title: sectionTitleMap.REVIEW_SNAPSHOT,
      displayOrder: 11,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        subject: viewModel.reviewSnapshots?.subject ?? [],
        comps: viewModel.reviewSnapshots?.comps ?? [],
      },
    },
    {
      type: "SEO_FINDINGS",
      title: sectionTitleMap.SEO_FINDINGS,
      displayOrder: 12,
      visibility: "CLIENT_SAFE",
      enabled: seoEnabled && hasSeoData,
      content: {
        seoScore: viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? null,
        competitorSeoScores: (viewModel.competitorWebsiteAudits ?? [])
          .filter((audit) => audit.seoScoreTotal !== null)
          .map((audit) => ({
            hotelId: audit.hotelId,
            hotelName: audit.hotelName,
            seoScoreTotal: audit.seoScoreTotal,
          })),
        notes: viewModel.websiteAudit?.seoFindings ?? viewModel.seoAudit?.notes ?? [],
      },
    },
    {
      type: "OPPORTUNITY_BUCKETS",
      title: sectionTitleMap.OPPORTUNITY_BUCKETS,
      displayOrder: 13,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        items: opportunityBuckets,
      },
    },
    {
      type: "ACTION_PLAN_30_60_90",
      title: sectionTitleMap.ACTION_PLAN_30_60_90,
      displayOrder: 14,
      visibility: "CLIENT_SAFE",
      enabled: true,
      content: {
        thirty: [
          "Validate pricing guardrails for low-position nights.",
          "Tighten booking CTA placement across high-intent pages.",
          "Audit offer exposure on homepage and room detail pages.",
        ],
        sixty: [
          "Refine weekday/weekend merchandising and promotional logic.",
          "Create a repeatable market-rate review cadence for near-term demand windows.",
          "Close core technical hygiene gaps on commercial landing pages.",
        ],
        ninety: [
          "Operationalize pricing + website review workflow across revenue and marketing owners.",
          "Track direct-booking conversion lift against implemented changes.",
          "Expand compset and room-type observation granularity where useful.",
        ],
      },
    },
    {
      type: "BATTLECARD",
      title: sectionTitleMap.BATTLECARD,
      displayOrder: 15,
      visibility: "INTERNAL_ONLY",
      enabled: true,
      content: battlecard,
    },
  ];

  return sections;
}
