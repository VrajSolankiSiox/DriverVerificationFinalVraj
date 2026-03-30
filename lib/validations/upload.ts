import { z } from "zod";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
];

export const uploadStartSchema = z.object({
  sourceName: z.string().min(2),
  subjectHotelId: z.string().min(1),
  compSetId: z.string().min(1),
  importMode: z.enum(["APPEND_NEW", "UPSERT_MATCHING"]),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1),
  fileSizeBytes: z.number().int().min(0).max(MAX_UPLOAD_BYTES),
});

export function validateUploadFile(file: { name: string; type: string; size: number }) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File size exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`);
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIMES.includes(mime) && !mime.startsWith("text/")) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      throw new Error("Only Excel (.xlsx, .xls) and CSV files are allowed.");
    }
  }
}

export const uploadSheetSelectionSchema = z.object({
  uploadBatchId: z.string().min(1),
  selectedSheet: z.string().min(1),
});

export const uploadMappingSchema = z.object({
  uploadBatchId: z.string().min(1),
  templateName: z.string().optional(),
  sourceName: z.string().min(1),
  mapping: z.record(z.string(), z.string().nullable()),
  normalization: z.object({
    dateFormat: z.string().optional().nullable(),
    currencyDefault: z.string().optional().nullable(),
    stripCurrencySymbols: z.boolean().default(true),
    stripCommas: z.boolean().default(true),
  }),
  saveTemplate: z.boolean().default(false),
});

export const uploadImportSchema = z.object({
  uploadBatchId: z.string().min(1),
  mode: z.enum(["APPEND_NEW", "UPSERT_MATCHING"]),
});
