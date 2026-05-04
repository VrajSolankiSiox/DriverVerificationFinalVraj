import type { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { format, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { evaluateAlerts } from "@/lib/services/alerts";
import { getLatestReviewSnapshots } from "@/lib/services/reviews";
import { parseCompMemberOtaRatings } from "@/lib/services/compsets";
import { canApproveReport } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";
import { computeRateAnalytics, type AnalyticsObservation } from "@/lib/analytics/rate-analytics";
import { buildReportSections, type ReportViewModel } from "@/lib/reports/sections";
import { buildRateObservationKey } from "@/lib/uploads/dedupe";
import { reportCreateSchema, reportUpdateSchema } from "@/lib/validations/report";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSyntheticCompHotelName(value: string) {
  const v = value.trim().toLowerCase();
  return (
    v.includes("market average") ||
    v.includes("single los shopping") ||
    v.includes("shopping results") ||
    v === "day"
  );
}

function getManualRatePlanTag(reportId: string) {
  return `MANUAL_REPORT:${reportId}`;
}

function buildHotelRateSeries(
  members: Array<{
    hotelId: string;
    roleType: "SUBJECT" | "COMP";
    hotel: { name: string };
  }>,
  observations: Array<{
    hotelId: string;
    stayDate: Date;
    captureDate: Date;
    nightlyRate: Prisma.Decimal;
  }>,
  dailyDates: string[],
) {
  const lines = members
    .filter((member) => member.roleType === "SUBJECT" || !isSyntheticCompHotelName(member.hotel.name))
    .map((member) => ({
      hotelId: member.hotelId,
      hotelName: member.hotel.name,
      roleType: member.roleType,
    }))
    .sort((a, b) => {
      if (a.roleType === b.roleType) return 0;
      return a.roleType === "SUBJECT" ? -1 : 1;
    });

  const latestByHotelDate = new Map<
    string,
    { hotelId: string; date: string; captureDate: Date; nightlyRate: number }
  >();

  for (const observation of observations) {
    const date = format(startOfDay(observation.stayDate), "yyyy-MM-dd");
    const key = `${observation.hotelId}|${date}`;
    const existing = latestByHotelDate.get(key);
    if (!existing || existing.captureDate < observation.captureDate) {
      latestByHotelDate.set(key, {
        hotelId: observation.hotelId,
        date,
        captureDate: observation.captureDate,
        nightlyRate: Number(observation.nightlyRate),
      });
    }
  }

  const byDate = new Map<string, Map<string, number>>();
  for (const row of latestByHotelDate.values()) {
    const current = byDate.get(row.date) ?? new Map<string, number>();
    current.set(row.hotelId, row.nightlyRate);
    byDate.set(row.date, current);
  }

  const points = dailyDates.map((date) => {
    const rates = byDate.get(date) ?? new Map<string, number>();
    const point: { date: string } & Record<string, number | string | null> = { date };
    lines.forEach((line) => {
      point[line.hotelId] = rates.get(line.hotelId) ?? null;
    });
    return point;
  });

  return { points, lines };
}

export async function listReports() {
  return prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subjectHotel: true,
      compSet: true,
      uploadBatch: true,
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
      uploadBatch: true,
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
      uploadBatch: true,
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
  const presentationConfig = (report.presentationConfigJson as { dataSource?: "UPLOAD" | "MANUAL"; manualRatePlanTag?: string } | null) ?? null;
  const manualRatePlanTag =
    !report.uploadBatchId &&
    presentationConfig?.dataSource === "MANUAL" &&
    typeof presentationConfig.manualRatePlanTag === "string" &&
    presentationConfig.manualRatePlanTag.trim().length > 0
      ? presentationConfig.manualRatePlanTag
      : null;
  const observations = await prisma.rateObservation.findMany({
    where: {
      hotelId: { in: hotelIds },
      ...(report.uploadBatchId ? { uploadBatchId: report.uploadBatchId } : {}),
      ...(manualRatePlanTag ? { ratePlan: manualRatePlanTag } : {}),
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
  const compHotelIds = report.compSet.members.filter((member) => member.roleType === "COMP").map((member) => member.hotelId);
  const latestCompWebsiteSnapshots = compHotelIds.length
    ? await prisma.websiteSnapshot.findMany({
        where: {
          hotelId: { in: compHotelIds },
          status: "COMPLETE",
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const compWebsiteAuditByHotelId = new Map<string, (typeof latestCompWebsiteSnapshots)[number]>();
  for (const snapshot of latestCompWebsiteSnapshots) {
    if (!compWebsiteAuditByHotelId.has(snapshot.hotelId)) {
      compWebsiteAuditByHotelId.set(snapshot.hotelId, snapshot);
    }
  }

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
  const hotelRateSeries = buildHotelRateSeries(
    report.compSet.members.map((member) => ({
      hotelId: member.hotelId,
      roleType: member.roleType,
      hotel: { name: member.hotel.name },
    })),
    observations.map((observation) => ({
      hotelId: observation.hotelId,
      stayDate: observation.stayDate,
      captureDate: observation.captureDate,
      nightlyRate: observation.nightlyRate,
    })),
    analytics.daily.map((row) => row.date),
  );

  const subjectRows = observations.filter((observation) => observation.hotelId === report.subjectHotelId);
  const subjectSourceNames = [
    ...new Set(
      subjectRows
        .map((observation) => (observation.sourceHotelName ?? "").trim())
        .filter((name) => Boolean(name)),
    ),
  ];
  const normalizedSubject = normalizeName(report.subjectHotel.name);
  const suspiciousSubjectRows = subjectRows.filter((observation) => {
    const sourceName = (observation.sourceHotelName ?? "").trim();
    if (!sourceName) return false;
    return normalizeName(sourceName) !== normalizedSubject;
  }).length;

  const subjectObservedNights = analytics.daily.filter((row) => row.subjectRate !== null).length;
  const nightsWithCompData = analytics.daily.filter((row) => row.compCount > 0).length;
  const observedHotelIds = new Set(observations.map((observation) => observation.hotelId));
  const missingCompSetHotelsInData = report.compSet.members
    .filter((member) => member.roleType === "COMP")
    .filter((member) => !isSyntheticCompHotelName(member.hotel.name))
    .filter((member) => !observedHotelIds.has(member.hotelId))
    .map((member) => member.hotel.name);
  const competitorWebsiteAudits = report.compSet.members
    .filter((member) => member.roleType === "COMP")
    .map((member) => {
      const snapshot = compWebsiteAuditByHotelId.get(member.hotelId);
      return {
        hotelId: member.hotelId,
        hotelName: member.hotel.name,
        scoreTotal: snapshot?.scoreTotal ?? null,
        seoScoreTotal: snapshot?.seoScoreTotal ?? null,
        capturedAt: snapshot ? snapshot.createdAt.toISOString() : null,
      };
    });

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
      otaRatings: (report.subjectHotel.otaRatings as Record<string, string | number> | null) ?? undefined,
    },
    compSet: {
      id: report.compSet.id,
      name: report.compSet.name,
      version: report.compSet.version,
      subjectOtaRatings: parseCompMemberOtaRatings(
        report.compSet.members.find((member) => member.roleType === "SUBJECT")?.notes,
      ),
      members: report.compSet.members.map((member) => ({
        id: member.hotel.id,
        name: member.hotel.name,
        roleType: member.roleType,
        otaRatings: parseCompMemberOtaRatings(member.notes),
      })),
    },
    analytics,
    hotelRateSeries,
    dataQuality: {
      subjectObservedNights,
      nightsWithCompData,
      suspiciousSubjectRows,
      subjectSourceNames,
      missingCompSetHotelsInData,
    },
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
    competitorWebsiteAudits,
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

export async function createReport(
  input: {
    name: string;
    subjectHotelId: string;
    compSetId: string;
    dataSource?: "UPLOAD" | "MANUAL";
    uploadBatchId?: string;
    manualRates?: Array<{ hotelId: string; date: string; nightlyRate: number }>;
  },
  actorId: string,
) {
  const parsed = reportCreateSchema.parse(input);

  const compSet = await prisma.compSet.findUniqueOrThrow({ where: { id: parsed.compSetId } });
  if (compSet.subjectHotelId !== parsed.subjectHotelId) {
    throw new Error("Selected compset does not belong to the chosen subject hotel.");
  }
  if (parsed.dataSource === "UPLOAD") {
    const uploadBatch = await prisma.uploadBatch.findUniqueOrThrow({
      where: { id: parsed.uploadBatchId },
      select: {
        id: true,
        status: true,
        subjectHotelId: true,
        compSetId: true,
        fileName: true,
      },
    });

    if (uploadBatch.subjectHotelId !== parsed.subjectHotelId) {
      throw new Error("Selected upload batch does not match the chosen subject hotel.");
    }
    if (uploadBatch.compSetId !== parsed.compSetId) {
      throw new Error("Selected upload batch does not match the chosen compset.");
    }
    if (uploadBatch.status !== "IMPORTED" && uploadBatch.status !== "PARTIAL_FAILED") {
      throw new Error(`Upload batch "${uploadBatch.fileName}" must be imported before creating a report.`);
    }

    const created = await prisma.report.create({
      data: {
        name: parsed.name,
        subjectHotelId: parsed.subjectHotelId,
        compSetId: parsed.compSetId,
        compSetVersion: compSet.version,
        uploadBatchId: parsed.uploadBatchId,
        createdById: actorId,
        updatedById: actorId,
        presentationConfigJson: { dataSource: "UPLOAD" },
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

  const members = await prisma.compSetMember.findMany({
    where: { compSetId: parsed.compSetId },
    select: { hotelId: true },
  });
  const allowedHotelIds = new Set(members.map((member) => member.hotelId));
  const todayCaptureDate = startOfDay(new Date());

  const manualRowsByHotelDate = new Map<string, { hotelId: string; stayDate: Date; nightlyRate: number }>();
  for (const row of parsed.manualRates ?? []) {
    if (!allowedHotelIds.has(row.hotelId)) {
      throw new Error("One or more manual rates reference a hotel outside the selected compset.");
    }
    const stayDate = startOfDay(new Date(row.date));
    if (Number.isNaN(stayDate.getTime())) {
      throw new Error("One or more manual rate rows have an invalid date.");
    }
    if (!Number.isFinite(row.nightlyRate) || row.nightlyRate <= 0) {
      throw new Error("One or more manual rate rows have an invalid nightly rate.");
    }

    manualRowsByHotelDate.set(`${row.hotelId}|${format(stayDate, "yyyy-MM-dd")}`, {
      hotelId: row.hotelId,
      stayDate,
      nightlyRate: row.nightlyRate,
    });
  }

  if (manualRowsByHotelDate.size === 0) {
    throw new Error("Add at least one manual rate to create a report.");
  }

  const created = await prisma.report.create({
    data: {
      name: parsed.name,
      subjectHotelId: parsed.subjectHotelId,
      compSetId: parsed.compSetId,
      compSetVersion: compSet.version,
      createdById: actorId,
      updatedById: actorId,
      presentationConfigJson: { dataSource: "MANUAL" },
      methodologyNote: "Insights are based on manually entered market rate observations and publicly observable website data. This is not a substitute for PMS, CRS, STR, or proprietary financial records. Observations represent available data at the time of analysis.",
    },
  });

  const manualRatePlanTag = getManualRatePlanTag(created.id);
  const observationRows = [...manualRowsByHotelDate.values()].map((row) => {
    const uniqueKey = buildRateObservationKey({
      hotelId: row.hotelId,
      stayDate: row.stayDate,
      captureDate: todayCaptureDate,
      roomType: null,
      ratePlan: manualRatePlanTag,
      refundableFlag: null,
      nightlyRate: row.nightlyRate,
      currency: "USD",
      availabilityStatus: null,
      sourceHotelName: "Manual Entry",
      sourceHotelCode: created.id,
    });

    return {
      hotelId: row.hotelId,
      stayDate: row.stayDate,
      captureDate: todayCaptureDate,
      roomType: null,
      ratePlan: manualRatePlanTag,
      refundableFlag: null,
      nightlyRate: row.nightlyRate,
      currency: "USD",
      availabilityStatus: null,
      sourceHotelName: "Manual Entry",
      sourceHotelCode: created.id,
      uniqueKey,
      createdById: actorId,
      updatedById: actorId,
    };
  });

  await prisma.$transaction([
    prisma.report.update({
      where: { id: created.id },
      data: {
        presentationConfigJson: {
          dataSource: "MANUAL",
          manualRatePlanTag,
        },
      },
    }),
    prisma.rateObservation.createMany({
      data: observationRows,
      skipDuplicates: true,
    }),
  ]);

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
          competitorWebsiteAudits: viewModel.competitorWebsiteAudits,
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
