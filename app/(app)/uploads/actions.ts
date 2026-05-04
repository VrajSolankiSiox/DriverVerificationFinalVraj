"use server";

import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/auth";
import { 
  deleteUploadBatch, 
  selectUploadSheet, 
  convertRateGridToValidation, 
  importUploadBatch,
  getUploadBatch
} from "@/lib/services/uploads";
import { addHotelsToCompSet } from "@/lib/services/compsets";

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

    const validation = await convertRateGridToValidation({ uploadBatchId: id, year }, user.id);
    const summary = validation.summary as {
      subjectHotelObservedInFile?: boolean;
      validationMessages?: string[];
    };

    if (summary.subjectHotelObservedInFile === false) {
      revalidatePath(`/uploads/${id}`);
      console.error(
        "Import blocked: subject hotel missing from Excel.",
        summary.validationMessages ?? [],
      );
      return;
    }

    await importUploadBatch({ uploadBatchId: id, mode: batch.importMode }, user.id);
    
    revalidatePath(`/uploads/${id}`);
  } catch (error) {
    console.error("Failed to convert rate grid:", error);
  }
}

export async function importObservationsAction(id: string, formData: FormData) {
  return convertRateGridAction(id, formData);
}

export async function resolveHotelsAction(id: string) {
  try {
    const user = await requireApiUser();
    const batch = await getUploadBatch(id);
    if (!batch) throw new Error("Batch not found");
    
    const validation = batch.validationJson as { summary?: { unresolvedHotels?: string[] } } | null;
    const unresolvedHotels = validation?.summary?.unresolvedHotels ?? [];
    
    if (unresolvedHotels.length > 0) {
      await addHotelsToCompSet({ compSetId: batch.compSetId, hotelNames: unresolvedHotels }, user.id);
    }
    
    revalidatePath(`/uploads/${id}`);
  } catch (error) {
    console.error("Failed to resolve hotels:", error);
  }
}
