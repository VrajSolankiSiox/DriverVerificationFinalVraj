import { prisma } from "@/lib/prisma";
import { getExportPath } from "@/lib/fs-storage";
import { buildReportViewModel } from "@/lib/services/reports";
import { generatePptx } from "@/lib/reports/export-pptx";
import { generatePdf } from "@/lib/reports/export-pdf";
import { logActivity } from "@/lib/activity-log";

export async function listExports() {
  return prisma.exportArtifact.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      report: {
        include: {
          subjectHotel: true,
        },
      },
    },
  });
}

export async function getExportArtifact(id: string) {
  return prisma.exportArtifact.findUnique({
    where: { id },
    include: {
      report: true,
    },
  });
}

export async function generateExport(
  input: {
    reportId: string;
    type: "PPTX" | "PDF";
    visibility: "CLIENT_SAFE" | "INTERNAL_FULL";
  },
  actorId: string,
) {
  const report = await prisma.report.findUniqueOrThrow({ where: { id: input.reportId } });
  if (input.visibility === "CLIENT_SAFE" && report.status !== "APPROVED" && report.status !== "EXPORTED") {
    throw new Error("Only approved reports can be exported in client-safe mode.");
  }

  const extension = input.type === "PPTX" ? "pptx" : "pdf";
  const fileName = `${report.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${input.visibility.toLowerCase()}.${extension}`;
  const storagePath = getExportPath(`${Date.now()}-${fileName}`);

  const artifact = await prisma.exportArtifact.create({
    data: {
      reportId: input.reportId,
      type: input.type,
      visibility: input.visibility,
      status: "PENDING",
      fileName,
      storagePath,
      createdById: actorId,
      updatedById: actorId,
    },
  });

  try {
    const viewModel = await buildReportViewModel(input.reportId);
    if (input.type === "PPTX") {
      await generatePptx(viewModel, input.visibility, storagePath);
    } else {
      await generatePdf(viewModel, input.visibility, storagePath);
    }

    const updated = await prisma.exportArtifact.update({
      where: { id: artifact.id },
      data: {
        status: "SUCCESS",
        generatedAt: new Date(),
        updatedById: actorId,
      },
    });

    if (report.status === "APPROVED") {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "EXPORTED",
          updatedById: actorId,
        },
      });
    }

    await logActivity({
      actorId,
      entityType: "ExportArtifact",
      entityId: updated.id,
      action: "GENERATED",
      message: `Generated ${input.type} export`,
      metadata: input,
    });

    return updated;
  } catch (error) {
    await prisma.exportArtifact.update({
      where: { id: artifact.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown export error",
        updatedById: actorId,
      },
    });
    throw error;
  }
}
