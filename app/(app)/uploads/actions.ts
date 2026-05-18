"use server";

import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { 
  deleteUploadBatch, 
  selectUploadSheet, 
  convertRateGridToValidation, 
  importUploadBatch,
  getUploadBatch,
  updateUploadBatchFile
} from "@/lib/services/uploads";
import { prisma } from "@/lib/prisma";
import { refreshReport } from "@/lib/services/reports";

export async function deleteUploadAction(id: string) {
  try {
    const user = await requireApiUser();
    await deleteUploadBatch(id, user.id);
    revalidatePath("/uploads");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete upload:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete upload" };
  }
}

export async function selectSheetAction(id: string, formData: FormData) {
  try {
    const user = await requireApiUser();
    const selectedSheet = formData.get("selectedSheet") as string;
    await selectUploadSheet({ uploadBatchId: id, selectedSheet }, user.id);
    revalidatePath(`/uploads/${id}`);
  } catch (error) {
    console.error("Failed to select sheet:", error);
  }
}

export async function convertRateGridAction(id: string, formData: FormData) {
  try {
    const user = await requireApiUser();
    const year = Number(formData.get("year"));
    const batch = await getUploadBatch(id);
    if (!batch) throw new Error("Batch not found");

    const validation = await convertRateGridToValidation(
      { uploadBatchId: id, year, autoAddUnresolvedHotels: false },
      user.id,
    );
    const summary = validation.summary as {
      subjectHotelObservedInFile?: boolean;
      validationMessages?: string[];
    };

    if (summary.subjectHotelObservedInFile === false) {
      revalidatePath(`/uploads/${id}`);
      console.error(
        "Import blocked: main property missing from Excel.",
        summary.validationMessages ?? [],
      );
      return;
    }

    await importUploadBatch({ uploadBatchId: id, mode: "APPEND_NEW" }, user.id);
    
    revalidatePath(`/uploads/${id}`);
  } catch (error) {
    console.error("Failed to convert rate grid:", error);
  }
}

export async function importObservationsAction(id: string, formData: FormData) {
  return convertRateGridAction(id, formData);
}

export async function pruneCompSetToMatchedHotelsAction(id: string) {
  try {
    await requireApiUser();
    const batch = await getUploadBatch(id);
    if (!batch) throw new Error("Batch not found");

    const validation = batch.validationJson as
      | {
          rows?: Array<{
            matchedHotelId?: string | null;
            errors?: string[];
          }>;
        }
      | null;

    const matchedHotelIds = [
      ...new Set(
        (validation?.rows ?? [])
          .filter((row) => (row.errors?.length ?? 0) === 0 && row.matchedHotelId)
          .map((row) => row.matchedHotelId as string),
      ),
    ];

    const keepHotelIds = [...new Set([batch.subjectHotelId, ...matchedHotelIds])];

    await prisma.compSetMember.deleteMany({
      where: {
        compSetId: batch.compSetId,
        roleType: "COMP",
        hotelId: { notIn: keepHotelIds },
      },
    });

    revalidatePath(`/uploads/${id}`);
  } catch (error) {
    console.error("Failed to prune compset to matched hotels:", error);
  }
}

export async function reuploadFileAction(id: string, formData: FormData) {
  try {
    const user = await requireApiUser();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("File is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const updated = await updateUploadBatchFile(
      id,
      {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        fileBuffer: buffer,
        keepSettings: true,
      },
      user.id,
    );

    // If we kept the sheet, try to re-process automatically
    if (updated.selectedSheet) {
      try {
        const isRateGrid = updated.mappingJson && (updated.mappingJson as any).format === "RATE_GRID";
        
        if (isRateGrid) {
          await convertRateGridToValidation({ uploadBatchId: id }, user.id);
        } else if (updated.mappingJson) {
          // Normal mapping validation
          // We might need sourceName, but it's usually in the batch
          await selectUploadSheet({ uploadBatchId: id, selectedSheet: updated.selectedSheet }, user.id);
        }

        await importUploadBatch({ uploadBatchId: id, mode: "APPEND_NEW" }, user.id);

        // Refresh all reports linked to this batch
        const reports = await prisma.report.findMany({
          where: { uploadBatchId: id },
          select: { id: true },
        });

        for (const report of reports) {
          await refreshReport(report.id, user.id);
        }
      } catch (processError) {
        console.error("Auto-processing after re-upload failed:", processError);
        // We still return success: true because the file WAS uploaded, but auto-processing failed.
      }
    }
    
    revalidatePath(`/uploads/${id}`);
    revalidatePath("/uploads");
    return { success: true };
  } catch (error) {
    console.error("Failed to re-upload file:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to re-upload file" };
  }
}
