import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getUploadPath, readBufferFromPath, saveBufferToPath, sanitizeFileName } from "@/lib/fs-storage";
import { logActivity } from "@/lib/activity-log";
import { buildRateObservationKey } from "@/lib/uploads/dedupe";
import { transformSheetRows, validateMapping } from "@/lib/uploads/mapping";
import { getSheetByName, getWorkbookMeta, parseWorkbookBuffer, previewSheetRows } from "@/lib/uploads/parse-workbook";
import { uploadImportSchema, uploadMappingSchema, uploadSheetSelectionSchema, uploadStartSchema, validateUploadFile } from "@/lib/validations/upload";

function normalizeHotelName(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function listUploadBatches() {
  return prisma.uploadBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subjectHotel: true,
      compSet: true,
    },
  });
}

export async function getUploadBatch(id: string) {
  return prisma.uploadBatch.findUnique({
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
      observations: true,
    },
  });
}

export async function listMappingTemplates(sourceName?: string) {
  return prisma.uploadMappingTemplate.findMany({
    where: sourceName ? { sourceName } : undefined,
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createUploadBatch(
  input: { sourceName: string; subjectHotelId: string; compSetId: string; importMode: "APPEND_NEW" | "UPSERT_MATCHING"; fileName: string; fileType: string; fileSizeBytes: number; fileBuffer: Buffer },
  actorId: string,
) {
  validateUploadFile({ name: input.fileName, type: input.fileType, size: input.fileSizeBytes });
  const parsed = uploadStartSchema.parse(input);
  const safeFileName = sanitizeFileName(input.fileName);
  const initial = await prisma.uploadBatch.create({
    data: {
      sourceName: parsed.sourceName,
      subjectHotelId: parsed.subjectHotelId,
      compSetId: parsed.compSetId,
      importMode: parsed.importMode,
      fileName: safeFileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      storagePath: "",
      createdById: actorId,
      updatedById: actorId,
    },
  });

  const storagePath = getUploadPath(`${initial.id}-${safeFileName}`);
  await saveBufferToPath(storagePath, input.fileBuffer);
  const sheets = parseWorkbookBuffer(input.fileBuffer, safeFileName);

  const batch = await prisma.uploadBatch.update({
    where: { id: initial.id },
    data: {
      storagePath,
      workbookMetaJson: getWorkbookMeta(sheets),
      status: "DRAFT",
    },
  });

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: batch.id,
    action: "CREATED",
    message: `Uploaded ${batch.fileName}`,
  });

  return batch;
}

export async function selectUploadSheet(input: { uploadBatchId: string; selectedSheet: string }, actorId: string) {
  const parsed = uploadSheetSelectionSchema.parse(input);
  const batch = await prisma.uploadBatch.findUniqueOrThrow({ where: { id: parsed.uploadBatchId } });
  const buffer = await readBufferFromPath(batch.storagePath);
  const sheets = parseWorkbookBuffer(buffer, batch.fileName);
  const sheet = getSheetByName(sheets, parsed.selectedSheet);

  const updated = await prisma.uploadBatch.update({
    where: { id: batch.id },
    data: {
      selectedSheet: parsed.selectedSheet,
      previewJson: previewSheetRows(sheet),
      status: "PARSED",
      updatedById: actorId,
    },
  });

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: batch.id,
    action: "SHEET_SELECTED",
    message: `Selected sheet ${parsed.selectedSheet}`,
  });

  return { batch: updated, headers: sheet.headers, preview: previewSheetRows(sheet) };
}

export async function validateUploadBatch(
  input: {
    uploadBatchId: string;
    sourceName: string;
    mapping: Record<string, string | null>;
    normalization: {
      dateFormat?: string | null;
      currencyDefault?: string | null;
      stripCurrencySymbols?: boolean;
      stripCommas?: boolean;
    };
    saveTemplate?: boolean;
    templateName?: string;
    nameOverrides?: Record<string, string>;
  },
  actorId: string,
) {
  const parsed = uploadMappingSchema.parse({
    ...input,
    saveTemplate: input.saveTemplate ?? false,
    templateName: input.templateName,
  });

  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id: parsed.uploadBatchId },
    include: {
      subjectHotel: true,
      compSet: {
        include: {
          members: {
            include: { hotel: true },
          },
        },
      },
    },
  });

  if (!batch.selectedSheet) {
    throw new Error("Select a sheet first.");
  }

  const mappingCheck = validateMapping(parsed.mapping);
  if (!mappingCheck.valid) {
    return {
      valid: false,
      missing: mappingCheck.missing,
      errors: mappingCheck.missing.map((field) => `${field.label} is required.`),
    };
  }

  const buffer = await readBufferFromPath(batch.storagePath);
  const sheets = parseWorkbookBuffer(buffer, batch.fileName);
  const sheet = getSheetByName(sheets, batch.selectedSheet);
  const transformed = transformSheetRows(sheet.rows, parsed.mapping, parsed.normalization);

  const hotelLookup = new Map<string, { id: string; name: string }>();
  batch.compSet.members.forEach((member) => {
    hotelLookup.set(normalizeHotelName(member.hotel.name), { id: member.hotel.id, name: member.hotel.name });
  });

  const nameOverrides = input.nameOverrides ?? {};
  const seenKeys = new Set<string>();
  const unresolved = new Set<string>();
  const rows = transformed.map((row) => {
    const sourceName = row.hotelName || row.hotelCode || null;
    const overrideHotelId = sourceName ? nameOverrides[sourceName] : undefined;
    const matched = overrideHotelId
      ? batch.compSet.members.find((member) => member.hotel.id === overrideHotelId)
      : hotelLookup.get(normalizeHotelName(row.hotelName));

    const matchedHotelId = matched && "hotel" in matched ? matched.hotel.id : matched?.id;
    const matchedHotelName = matched && "hotel" in matched ? matched.hotel.name : matched?.name;

    const duplicateKey =
      row.stayDate && row.captureDate && row.currency && row.nightlyRate !== null && matchedHotelId
        ? [
            matchedHotelId,
            format(row.stayDate, "yyyy-MM-dd"),
            format(row.captureDate, "yyyy-MM-dd"),
            row.roomType ?? "null",
            row.ratePlan ?? "null",
            row.refundableFlag === null ? "null" : String(row.refundableFlag),
            row.currency,
          ].join("|")
        : null;

    if (sourceName && !matched) {
      unresolved.add(sourceName);
    }

    const duplicateInFile = duplicateKey ? seenKeys.has(duplicateKey) : false;
    if (duplicateKey) {
      seenKeys.add(duplicateKey);
    }

    return {
      ...row,
      matchedHotelId: matchedHotelId ?? null,
      matchedHotelName: matchedHotelName ?? null,
      duplicateInFile,
      errors: duplicateInFile ? [...row.errors, "Duplicate row in file."] : row.errors,
      stayDate: row.stayDate?.toISOString() ?? null,
      captureDate: row.captureDate?.toISOString() ?? null,
    };
  });

  const validRows = rows.filter((row) => row.errors.length === 0 && row.matchedHotelId);
  const validation = {
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: rows.filter((row) => row.errors.length > 0).length,
      duplicatesInFile: rows.filter((row) => row.duplicateInFile).length,
      unresolvedHotels: [...unresolved],
    },
    rows,
    mapping: parsed.mapping,
    normalization: parsed.normalization,
  };

  await prisma.uploadBatch.update({
    where: { id: batch.id },
    data: {
      mappingJson: parsed.mapping,
      validationJson: validation,
      status: "VALIDATED",
      updatedById: actorId,
    },
  });

  if (parsed.saveTemplate && parsed.templateName) {
    await prisma.uploadMappingTemplate.create({
      data: {
        organizationKey: "rank-me-now",
        sourceName: parsed.sourceName,
        name: parsed.templateName,
        mappingJson: parsed.mapping,
        normalizationJson: parsed.normalization,
        createdById: actorId,
        updatedById: actorId,
        lastUsedAt: new Date(),
      },
    });
  }

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: batch.id,
    action: "VALIDATED",
    message: `Validated upload batch ${batch.fileName}`,
    metadata: validation.summary,
  });

  return validation;
}

export async function importUploadBatch(input: { uploadBatchId: string; mode: "APPEND_NEW" | "UPSERT_MATCHING" }, actorId: string) {
  const parsed = uploadImportSchema.parse(input);
  const batch = await prisma.uploadBatch.findUniqueOrThrow({ where: { id: parsed.uploadBatchId } });
  const validation = batch.validationJson as {
    rows: Array<{
      rowNumber: number;
      hotelName: string | null;
      stayDate: string | null;
      captureDate: string | null;
      roomType: string | null;
      ratePlan: string | null;
      refundableFlag: boolean | null;
      nightlyRate: number | null;
      currency: string | null;
      availabilityStatus: string | null;
      matchedHotelId: string | null;
      matchedHotelName: string | null;
      errors: string[];
    }>;
    summary: { totalRows: number; validRows: number };
  } | null;

  if (!validation) {
    throw new Error("Validate the upload before importing.");
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of validation.rows) {
    if (row.errors.length > 0 || !row.matchedHotelId || !row.stayDate || !row.captureDate || row.nightlyRate === null || !row.currency) {
      skipped += 1;
      continue;
    }

    const payload = {
      hotelId: row.matchedHotelId,
      stayDate: new Date(row.stayDate),
      captureDate: new Date(row.captureDate),
      roomType: row.roomType,
      ratePlan: row.ratePlan,
      refundableFlag: row.refundableFlag,
      nightlyRate: row.nightlyRate,
      currency: row.currency,
      availabilityStatus: row.availabilityStatus,
      sourceHotelName: row.hotelName,
      sourceHotelCode: null,
    };

    const uniqueKey = buildRateObservationKey(payload);
    const existing = await prisma.rateObservation.findUnique({ where: { uniqueKey } });

    if (existing && parsed.mode === "APPEND_NEW") {
      skipped += 1;
      continue;
    }

    if (existing && parsed.mode === "UPSERT_MATCHING") {
      await prisma.rateObservation.update({
        where: { uniqueKey },
        data: {
          nightlyRate: row.nightlyRate,
          availabilityStatus: row.availabilityStatus,
          uploadBatchId: batch.id,
          updatedById: actorId,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.rateObservation.create({
      data: {
        hotelId: row.matchedHotelId,
        stayDate: new Date(row.stayDate),
        captureDate: new Date(row.captureDate),
        roomType: row.roomType,
        ratePlan: row.ratePlan,
        refundableFlag: row.refundableFlag,
        nightlyRate: row.nightlyRate,
        currency: row.currency,
        availabilityStatus: row.availabilityStatus,
        sourceHotelName: row.hotelName,
        sourceHotelCode: null,
        uniqueKey,
        uploadBatchId: batch.id,
        createdById: actorId,
        updatedById: actorId,
      },
    });
    inserted += 1;
  }

  const summary = {
    inserted,
    updated,
    skipped,
    totalRows: validation.summary.totalRows,
    validRows: validation.summary.validRows,
  };

  await prisma.uploadBatch.update({
    where: { id: batch.id },
    data: {
      status: skipped > 0 ? "PARTIAL_FAILED" : "IMPORTED",
      summaryJson: summary,
      updatedById: actorId,
    },
  });

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: batch.id,
    action: "IMPORTED",
    message: `Imported upload batch ${batch.fileName}`,
    metadata: summary,
  });

  return summary;
}
