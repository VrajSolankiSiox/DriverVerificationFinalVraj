import type { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { evaluateAlerts } from "@/lib/services/alerts";
import { getLatestReviewSnapshots } from "@/lib/services/reviews";
import { canApproveReport } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
import { computeRateAnalytics, type AnalyticsObservation } from "@/lib/analytics/rate-analytics";
import { buildReportSections, type ReportViewModel } from "@/lib/reports/sections";
import { reportCreateSchema, reportUpdateSchema } from "@/lib/validations/report";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

export async function listReports() {
  return prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subjectHotel: true,
      compSet: true,
      exports: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getReport(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      subjectHotel: true,
      compSet: {
        include: {
          members: {
            include: { hotel: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
      sections: {
        orderBy: { displayOrder: "asc" },
      },
      exports: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function buildReportViewModel(reportId: string): Promise<ReportViewModel> {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: {
      subjectHotel: true,
      compSet: {
        include: {
          members: {
            include: { hotel: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
      sections: true,
    },
  });

  const hotelIds = report.compSet.members.map((member) => member.hotelId);
  const observations = await prisma.rateObservation.findMany({
    where: {
      hotelId: { in: hotelIds },
    },
    include: {
      hotel: true,
    },
    orderBy: [{ stayDate: "asc" }, { captureDate: "desc" }],
  });

  const websiteSnapshot = await prisma.websiteSnapshot.findFirst({
    where: { hotelId: report.subjectHotelId, status: "COMPLETE" },
    orderBy: { createdAt: "desc" },
  });

  const reviewSnapshotsByHotel = await getLatestReviewSnapshots(hotelIds);
  const subjectReview = reviewSnapshotsByHotel[report.subjectHotelId] ?? [];
  const compReviews = report.compSet.members
    .filter((m) => m.roleType === "COMP")
    .map((m) => ({ hotelId: m.hotelId, hotelName: m.hotel.name, snapshots: reviewSnapshotsByHotel[m.hotelId] ?? [] }));

  const seoAudit = websiteSnapshot?.seoFindingsJson as { notes?: string[]; breakdown?: { total: number } } | null;

  const analyticsInput: AnalyticsObservation[] = observations.map((observation) => ({
    hotelId: observation.hotelId,
    hotelName: observation.hotel.name,
    roleType: observation.hotelId === report.subjectHotelId ? "SUBJECT" : "COMP",
    stayDate: observation.stayDate,
    captureDate: observation.captureDate,
    nightlyRate: Number(observation.nightlyRate),
    currency: observation.currency,
    availabilityStatus: observation.availabilityStatus,
    roomType: observation.roomType,
  }));

  const analytics = computeRateAnalytics(analyticsInput, report.subjectHotelId, 90);

  return {
    reportId: report.id,
    reportName: report.name,
    status: report.status,
    confidenceLevel: report.confidenceLevel ?? analytics.confidenceLevel,
    subjectHotel: {
      id: report.subjectHotel.id,
      name: report.subjectHotel.name,
      brand: report.subjectHotel.brand,
      city: report.subjectHotel.city,
      state: report.subjectHotel.state,
      country: report.subjectHotel.country,
      websiteUrl: report.subjectHotel.websiteUrl,
      roomCount: report.subjectHotel.roomCount,
      starLevel: decimalToNumber(report.subjectHotel.starLevel),
    },
    compSet: {
      id: report.compSet.id,
      name: report.compSet.name,
      version: report.compSet.version,
      members: report.compSet.members.map((member) => ({
        id: member.hotel.id,
        name: member.hotel.name,
        roleType: member.roleType,
      })),
    },
    analytics,
    websiteAudit: websiteSnapshot
      ? {
          scoreTotal: websiteSnapshot.scoreTotal,
          directBookingUxScore: websiteSnapshot.directBookingUxScore,
          contentCompletenessScore: websiteSnapshot.contentCompletenessScore,
          technicalHygieneScore: websiteSnapshot.technicalHygieneScore,
          offerVisibilityScore: websiteSnapshot.offerVisibilityScore,
          trustContactScore: websiteSnapshot.trustContactScore,
          seoScoreTotal: websiteSnapshot.seoScoreTotal,
          seoFindings: seoAudit?.notes ?? [],
          notes: ((websiteSnapshot.summaryJson as { notes?: string[] } | null)?.notes ?? []),
        }
      : null,
    reviewSnapshots: {
      subject: subjectReview,
      comps: compReviews,
    },
    seoAudit: seoAudit ? { total: seoAudit.breakdown?.total ?? 0, notes: seoAudit.notes ?? [] } : null,
    manualExecutiveSummary: report.executiveSummary,
    manualOpportunityNotes: report.manualOpportunityNotes,
    methodologyNote: report.methodologyNote,
  };
}

export async function createReport(input: { name: string; subjectHotelId: string; compSetId: string }, actorId: string) {
  const parsed = reportCreateSchema.parse(input);
  const compSet = await prisma.compSet.findUniqueOrThrow({ where: { id: parsed.compSetId } });
  const created = await prisma.report.create({
    data: {
      name: parsed.name,
      subjectHotelId: parsed.subjectHotelId,
      compSetId: parsed.compSetId,
      compSetVersion: compSet.version,
      createdById: actorId,
      updatedById: actorId,
      methodologyNote: "Insights are based on uploaded market rate observations and publicly observable website data. This is not a substitute for PMS, CRS, STR, or proprietary financial records. Observations represent available data at the time of analysis.",
    },
  });

  await refreshReport(created.id, actorId);

  await logActivity({
    actorId,
    entityType: "Report",
    entityId: created.id,
    action: "CREATED",
    message: `Created report ${created.name}`,
  });

  return prisma.report.findUniqueOrThrow({ where: { id: created.id } });
}

export async function refreshReport(reportId: string, actorId: string) {
  const viewModel = await buildReportViewModel(reportId);
  const sections = buildReportSections(viewModel);

  await prisma.$transaction([
    prisma.report.update({
      where: { id: reportId },
      data: {
        analysisJson: {
          analytics: viewModel.analytics,
          websiteAudit: viewModel.websiteAudit,
        },
        compSnapshotJson: viewModel.compSet,
        confidenceLevel: viewModel.analytics.confidenceLevel,
        updatedById: actorId,
      },
    }),
    prisma.reportSection.deleteMany({ where: { reportId } }),
    prisma.reportSection.createMany({
      data: sections.map((section) => ({
        reportId,
        type: section.type,
        title: section.title,
        displayOrder: section.displayOrder,
        visibility: section.visibility,
        enabled: section.enabled,
        contentJson: section.content as Prisma.InputJsonValue,
      })),
    }),
  ]);

  await evaluateAlerts(reportId, viewModel);

  await logActivity({
    actorId,
    entityType: "Report",
    entityId: reportId,
    action: "REFRESHED",
    message: "Refreshed report analytics and sections",
  });

  return getReport(reportId);
}

export async function updateReport(
  input: {
    reportId: string;
    executiveSummary?: string | null;
    manualOpportunityNotes?: string | null;
    methodologyNote?: string | null;
    status?: "DRAFT" | "REVIEW_READY" | "APPROVED" | "EXPORTED";
    sectionOrder?: Array<{ id: string; displayOrder: number; enabled: boolean; visibility: "CLIENT_SAFE" | "INTERNAL_ONLY" }>;
  },
  actorId: string,
  actorRole?: UserRole,
) {
  const parsed = reportUpdateSchema.parse(input);
  const status = parsed.status;
  if (status === "APPROVED" || status === "EXPORTED") {
    if (!actorRole || !canApproveReport(actorRole)) {
      throw new Error("Only managers can approve or mark reports as exported.");
    }
  }
  await prisma.report.update({
    where: { id: parsed.reportId },
    data: {
      executiveSummary: parsed.executiveSummary ?? null,
      manualOpportunityNotes: parsed.manualOpportunityNotes ?? null,
      methodologyNote: parsed.methodologyNote ?? null,
      status,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      approvedById: status === "APPROVED" ? actorId : undefined,
      updatedById: actorId,
    },
  });

  if (parsed.sectionOrder?.length) {
    await prisma.$transaction(
      parsed.sectionOrder.map((section) =>
        prisma.reportSection.update({
          where: { id: section.id },
          data: {
            displayOrder: section.displayOrder,
            enabled: section.enabled,
            visibility: section.visibility,
          },
        }),
      ),
    );
  }

  await logActivity({
    actorId,
    entityType: "Report",
    entityId: parsed.reportId,
    action: "UPDATED",
    message: "Updated report content or status",
  });

  return getReport(parsed.reportId);
}

export async function approveReport(reportId: string, actorId: string, actorRole: UserRole) {
  return updateReport({ reportId, status: "APPROVED" }, actorId, actorRole);
}
