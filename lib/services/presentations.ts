import { prisma } from "@/lib/prisma";

export type PresentationSlideOverrides = Record<string, string>;

export async function listPresentations() {
  return prisma.presentation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          subjectHotel: { select: { name: true } },
        },
      },
    },
  });
}

export async function getPresentationById(id: string) {
  return prisma.presentation.findUnique({
    where: { id },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          subjectHotel: { select: { name: true } },
        },
      },
    },
  });
}

export async function createPresentationForReport(reportId: string, userId: string) {
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    select: { id: true, name: true },
  });

  return prisma.presentation.create({
    data: {
      reportId: report.id,
      name: `${report.name} Presentation`,
      createdById: userId,
      updatedById: userId,
      slideTitlesJson: {},
    },
  });
}

export async function updatePresentation(
  id: string,
  userId: string,
  input: {
    name?: string;
    reportTitleOverride?: string | null;
    slideTitlesJson?: PresentationSlideOverrides;
  },
) {
  return prisma.presentation.update({
    where: { id },
    data: {
      name: input.name,
      reportTitleOverride: input.reportTitleOverride,
      slideTitlesJson: input.slideTitlesJson,
      updatedById: userId,
    },
  });
}
