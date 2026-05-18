import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { format, formatISO, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getUploadPath, readBufferFromPath, saveBufferToPath, sanitizeFileName, deleteFileFromPath } from "@/lib/fs-storage";
import { logActivity } from "@/lib/activity-log";
import { addHotelsToCompSet } from "@/lib/services/compsets";
import { buildRateObservationKey } from "@/lib/uploads/dedupe";
import { transformSheetRows, validateMapping } from "@/lib/uploads/mapping";
import { getSheetByName, getWorkbookMeta, parseWorkbookBuffer, previewSheetRows } from "@/lib/uploads/parse-workbook";
import { uploadImportSchema, uploadMappingSchema, uploadSheetSelectionSchema, uploadStartSchema, validateUploadFile } from "@/lib/validations/upload";

function normalizeHotelName(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function readUploadBatchBuffer(batch: { storagePath: string; fileBlob?: Uint8Array | null; fileName: string }) {
  if (batch.fileBlob && batch.fileBlob.length) {
    return Buffer.from(batch.fileBlob);
  }

  if (!batch.storagePath) {
    throw new Error(`Upload file missing for "${batch.fileName}". Please re-upload the file.`);
  }

  try {
    return await readBufferFromPath(batch.storagePath);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "ENOENT") {
      throw new Error(
        `Upload file not found at "${batch.storagePath}". This can happen on serverless deploys if temporary storage is cleared. Please re-upload the file.`,
      );
    }
    throw error;
  }
}

function parseHeaderDate(value: unknown, yearFallback: number) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)); return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const text = String(value ?? "").trim();
  if (!text) return null;

  // Common patterns like "16-Apr", "16-Apr-2026", "16/Apr", "2026-04-16"
  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  if (isoLike.test(text)) {
    const [y, m, day] = text.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1, day)); return Number.isNaN(d.getTime()) ? null : d;
  }

  const numeric = text.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const yearText = numeric[3];
    const year = yearText ? Number(yearText.length === 2 ? `20${yearText}` : yearText) : yearFallback;
    if (!Number.isFinite(year) || !Number.isFinite(first) || !Number.isFinite(second)) {
      return null;
    }

    // Default to MM/DD, but gracefully handle DD/MM when first segment exceeds 12.
    const month = (first > 12 ? second : first) - 1;
    const day = first > 12 ? first : second;
    if (month < 0 || month > 11 || day < 1 || day > 31) {
      return null;
    }
    const d = new Date(Date.UTC(year, month, day)); return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = text.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})(?:[-/ ](\d{2,4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const yearText = m[3];
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const monthIndex = months[mon];
  if (monthIndex === undefined) return null;
  const year = yearText ? Number(yearText.length === 2 ? `20${yearText}` : yearText) : yearFallback;
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null;
  const d = new Date(Date.UTC(year, monthIndex, day)); return Number.isNaN(d.getTime()) ? null : d;
}

function looksLikeDow(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(text);
}

function isMarketAverageRow(value: string) {
  const v = value.trim().toLowerCase();
  return (
    v.includes("market average") ||
    v.includes("market avg") ||
    v.includes("single los shopping") ||
    v.includes("shopping results") ||
    v === "day"
  );
}

function parseRateCellNumber(cell: XLSX.CellObject | undefined) {
  if (!cell) return null;
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    return cell.v;
  }

  const parseFromText = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const cleaned = text.replace(/[,$]/g, "").replace(/[^\d.-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return parseFromText(cell.v) ?? parseFromText(cell.w);
}

function isSoldOutText(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "x" || text === "soldout" || text === "sold out" || text === "na" || text === "n/a";
}

function extractRateGridObservations(
  worksheet: XLSX.WorkSheet,
  {
    yearFallback,
    captureDate,
  }: { yearFallback: number; captureDate: Date },
) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");

  let headerRow = range.s.r;
  let dateCols: number[] = [];

  // Find the row with the most date-like headers (scan first 10 rows)
  const scanMax = Math.min(range.e.r, range.s.r + 9);
  for (let r = range.s.r; r <= scanMax; r += 1) {
    const cols: number[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      const parsed = parseHeaderDate(cell?.v, yearFallback);
      if (parsed) cols.push(c);
    }
    if (cols.length > dateCols.length) {
      headerRow = r;
      dateCols = cols;
    }
  }

  if (dateCols.length < 2) {
    throw new Error("Could not detect date columns in this sheet. Use the row-based upload format instead.");
  }

  const firstDateCol = Math.min(...dateCols);
  const nameCol = Math.max(range.s.c, firstDateCol - 1);

  // Skip optional day-of-week row
  const dowRow = headerRow + 1;
  let dataStartRow = headerRow + 1;
  let dowCount = 0;
  for (const c of dateCols) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: dowRow, c })];
    if (looksLikeDow(cell?.v)) dowCount += 1;
  }
  if (dowCount >= Math.ceil(dateCols.length * 0.6)) {
    dataStartRow = headerRow + 2;
  }

  const dateByCol = new Map<number, Date>();
  for (const c of dateCols) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    const d = parseHeaderDate(cell?.v, yearFallback);
    if (d) dateByCol.set(c, d);
  }

  const rows: Array<{
    rowNumber: number;
    hotelName: string | null;
    hotelCode: string | null;
    stayDate: Date | null;
    captureDate: Date | null;
    roomType: string | null;
    ratePlan: string | null;
    refundableFlag: boolean | null;
    nightlyRate: number | null;
    currency: string | null;
    availabilityStatus: string | null;
    errors: string[];
  }> = [];

  let syntheticRowNumber = 2;
  for (let r = dataStartRow; r <= range.e.r; r += 1) {
    const nameCell = worksheet[XLSX.utils.encode_cell({ r, c: nameCol })];
    const hotelName = String(nameCell?.v ?? "").trim();
    if (!hotelName) {
      continue;
    }
    if (isMarketAverageRow(hotelName)) {
      continue;
    }

    for (const c of dateCols) {
      const stayDate = dateByCol.get(c) ?? null;
      const valueCell = worksheet[XLSX.utils.encode_cell({ r, c })];
      const valueText = String(valueCell?.v ?? valueCell?.w ?? "").trim();
      if (!valueText) continue;
      if (isSoldOutText(valueText)) {
        rows.push({
          rowNumber: syntheticRowNumber++,
          hotelName,
          hotelCode: null,
          stayDate,
          captureDate,
          roomType: null,
          ratePlan: null,
          refundableFlag: null,
          nightlyRate: 0,
          currency: null,
          availabilityStatus: "SOLD_OUT",
          errors: stayDate ? [] : ["Stay date is required."],
        });
        continue;
      }
      const nightlyRate = parseRateCellNumber(valueCell);
      if (nightlyRate === null) {
        rows.push({
          rowNumber: syntheticRowNumber++,
          hotelName,
          hotelCode: null,
          stayDate,
          captureDate,
          roomType: null,
          ratePlan: null,
          refundableFlag: null,
          nightlyRate: null,
          currency: null,
          availabilityStatus: null,
          errors: ["Nightly rate must be numeric."],
        });
        continue;
      }

      rows.push({
        rowNumber: syntheticRowNumber++,
        hotelName,
        hotelCode: null,
        stayDate,
        captureDate,
        roomType: null,
        ratePlan: null,
        refundableFlag: null,
        nightlyRate,
        currency: null,
        availabilityStatus: null,
        errors: stayDate ? [] : ["Stay date is required."],
      });
    }
  }

  return rows;
}

export async function listUploadBatches() {
  return prisma.uploadBatch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceName: true,
      fileName: true,
      fileType: true,
      fileSizeBytes: true,
      status: true,
      importMode: true,
      selectedSheet: true,
      summaryJson: true,
      createdAt: true,
      subjectHotel: { select: { id: true, name: true } },
      compSet: { select: { id: true, name: true } },
    },
  });
}

export async function getUploadBatch(id: string) {
  return prisma.uploadBatch.findUnique({
    where: { id },
    select: {
      id: true,
      sourceName: true,
      fileName: true,
      fileType: true,
      fileSizeBytes: true,
      storagePath: true,
      subjectHotelId: true,
      compSetId: true,
      status: true,
      importMode: true,
      workbookMetaJson: true,
      selectedSheet: true,
      mappingJson: true,
      previewJson: true,
      validationJson: true,
      summaryJson: true,
      createdAt: true,
      updatedAt: true,
      subjectHotel: { select: { id: true, name: true } },
      compSet: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              id: true,
              roleType: true,
              hotel: { select: { id: true, name: true } },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
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
  input: {
    sourceName: string;
    subjectHotelId: string;
    compSetId: string;
    importMode: "APPEND_NEW";
    scheduledDemoDate?: string | null;
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    fileBuffer: Buffer;
  },
  actorId: string,
) {
  validateUploadFile({ name: input.fileName, type: input.fileType, size: input.fileSizeBytes });
  const parsed = uploadStartSchema.parse(input);
  const safeFileName = sanitizeFileName(input.fileName);
  const createData: Prisma.UploadBatchCreateInput = {
    sourceName: parsed.sourceName,
    subjectHotel: { connect: { id: parsed.subjectHotelId } },
    compSet: { connect: { id: parsed.compSetId } },
    importMode: parsed.importMode,
    fileName: safeFileName,
    fileType: input.fileType,
    fileSizeBytes: input.fileSizeBytes,
    storagePath: "",
    createdById: actorId,
    updatedById: actorId,
    originalMetadataJson: {
      scheduledDemoDate: parsed.scheduledDemoDate || null,
    },
  };

  if (process.env.VERCEL || process.env.PERSIST_UPLOADS_IN_DB === "true") {
    createData.fileBlob = new Uint8Array(
      input.fileBuffer.buffer as ArrayBuffer,
      input.fileBuffer.byteOffset,
      input.fileBuffer.byteLength,
    );
  }

  const initial = await prisma.uploadBatch.create({
    data: {
      ...createData,
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

  const subjectHotel = await prisma.hotel.findUnique({
    where: { id: parsed.subjectHotelId },
    select: { id: true, name: true },
  });
  if (subjectHotel) {
    const demoSessionModel = (prisma as unknown as { demoSession?: { create: (args: unknown) => Promise<unknown> } })
      .demoSession;
    if (demoSessionModel?.create) {
      await demoSessionModel.create({
        data: {
          hotelId: subjectHotel.id,
          uploadBatchId: batch.id,
          hotelName: subjectHotel.name,
          hotelOwnerName: null,
          scheduledDate: parsed.scheduledDemoDate ? new Date(parsed.scheduledDemoDate) : null,
          conducted: false,
          conductedBy: null,
          ownerFeedback: null,
          additionalNotes: null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    } else {
      console.warn("[uploads] DemoSession model unavailable; skipping demo auto-seed for upload", batch.id);
    }
  }

  return batch;
}

export async function selectUploadSheet(input: { uploadBatchId: string; selectedSheet: string }, actorId: string) {
  const parsed = uploadSheetSelectionSchema.parse(input);
  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id: parsed.uploadBatchId },
    select: {
      id: true,
      storagePath: true,
      fileName: true,
    },
  });
  const buffer = await readUploadBatchBuffer(batch);
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
    autoAddUnresolvedHotels?: boolean;
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
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      selectedSheet: true,
      compSetId: true,
      compSet: {
        select: {
          members: {
            select: {
              hotelId: true,
              hotel: { select: { id: true, name: true } },
            },
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

  const buffer = await readUploadBatchBuffer(batch);
  const sheets = parseWorkbookBuffer(buffer, batch.fileName);
  const sheet = getSheetByName(sheets, batch.selectedSheet);
  const transformed = transformSheetRows(sheet.rows, parsed.mapping, parsed.normalization);

  const namesInFile = [
    ...new Set(
      transformed
        .map((row) => row.hotelName || row.hotelCode || "")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  const initialLookup = new Set(batch.compSet.members.map((m) => normalizeHotelName(m.hotel.name)));
  const unresolvedFromFile = namesInFile.filter((name) => !initialLookup.has(normalizeHotelName(name)));
  const unresolvedHotelsToAutoAdd = unresolvedFromFile.filter((name) => !isMarketAverageRow(name));

  let autoAddedHotels = 0;
  if (parsed.autoAddUnresolvedHotels && unresolvedHotelsToAutoAdd.length) {
    const result = await addHotelsToCompSet(
      {
        compSetId: batch.compSetId,
        hotelNames: unresolvedHotelsToAutoAdd,
      },
      actorId,
    );
    autoAddedHotels = result.addedMembers;
  }

  const members =
    autoAddedHotels > 0
      ? (
          await prisma.compSet.findUniqueOrThrow({
            where: { id: batch.compSetId },
            select: {
              members: {
                select: {
                  hotelId: true,
                  hotel: { select: { id: true, name: true } },
                },
              },
            },
          })
        ).members
      : batch.compSet.members;

  const hotelLookup = new Map<string, { id: string; name: string }>();
  const hotelsById = new Map<string, { id: string; name: string }>();
  members.forEach((member) => {
    hotelsById.set(member.hotelId, { id: member.hotel.id, name: member.hotel.name });
    hotelLookup.set(normalizeHotelName(member.hotel.name), { id: member.hotel.id, name: member.hotel.name });
  });

  const nameOverrides = input.nameOverrides ?? {};
  const seenKeys = new Set<string>();
  const unresolved = new Set<string>();
  const rows = transformed.map((row) => {
    const sourceName = row.hotelName || row.hotelCode || null;
    const overrideHotelId = sourceName ? nameOverrides[sourceName] : undefined;
    const matched = overrideHotelId
      ? hotelsById.get(overrideHotelId)
      : hotelLookup.get(normalizeHotelName(row.hotelName));

    const matchedHotelId = matched?.id;
    const matchedHotelName = matched?.name;
    const errors = [...row.errors];

    if (sourceName && !matchedHotelId && !isMarketAverageRow(sourceName)) {
      errors.push("Hotel not found in compset. Add this hotel to the compset or provide a name override.");
    }
    if (sourceName && isMarketAverageRow(sourceName)) {
      errors.push("Market Average rows are ignored.");
    }

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

    if (sourceName && !matched && !isMarketAverageRow(sourceName)) {
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
      errors: duplicateInFile ? [...errors, "Duplicate row in file."] : errors,
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
      autoAddedHotels,
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

export async function importUploadBatch(input: { uploadBatchId: string; mode: "APPEND_NEW" }, actorId: string) {
  const parsed = uploadImportSchema.parse(input);
  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id: parsed.uploadBatchId },
    select: {
      id: true,
      fileName: true,
      validationJson: true,
    },
  });
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

  let skipped = 0;

  const candidates: Array<{
    uniqueKey: string;
    create: Prisma.RateObservationCreateManyInput;
    update: { uniqueKey: string; nightlyRate: number; availabilityStatus: string | null };
  }> = [];

  const skipReasons = {
    hasErrors: 0,
    noMatchedHotel: 0,
    noStayDate: 0,
    noCaptureDate: 0,
    noNightlyRate: 0,
    noCurrency: 0,
    existing: 0,
  };

  for (const row of validation.rows) {
    if (row.errors.length > 0) {
      skipReasons.hasErrors += 1;
      skipped += 1;
      continue;
    }
    if (!row.matchedHotelId) {
      skipReasons.noMatchedHotel += 1;
      skipped += 1;
      continue;
    }
    if (row.stayDate === null || row.stayDate === undefined || row.stayDate === "") {
      skipReasons.noStayDate += 1;
      skipped += 1;
      continue;
    }
    if (row.captureDate === null || row.captureDate === undefined || row.captureDate === "") {
      skipReasons.noCaptureDate += 1;
      skipped += 1;
      continue;
    }
    const soldOut = String(row.availabilityStatus ?? "").toUpperCase().includes("SOLD_OUT");
    if ((row.nightlyRate === null || row.nightlyRate === undefined) && !soldOut) {
      skipReasons.noNightlyRate += 1;
      skipped += 1;
      continue;
    }
    if (row.currency === null || row.currency === undefined || row.currency === "") {
      skipReasons.noCurrency += 1;
      skipped += 1;
      continue;
    }

    const payloadForKey = {
      hotelId: row.matchedHotelId,
      stayDate: new Date(row.stayDate),
      captureDate: new Date(row.captureDate),
      roomType: row.roomType,
      ratePlan: row.ratePlan,
      refundableFlag: row.refundableFlag,
      nightlyRate: soldOut ? 0 : Number(row.nightlyRate),
      currency: row.currency,
      availabilityStatus: row.availabilityStatus,
      sourceHotelName: row.hotelName,
      sourceHotelCode: null,
    };

    const uniqueKey = buildRateObservationKey(payloadForKey);

    candidates.push({
      uniqueKey,
      create: {
        hotelId: row.matchedHotelId,
        stayDate: new Date(row.stayDate),
        captureDate: new Date(row.captureDate),
        roomType: row.roomType,
        ratePlan: row.ratePlan,
        refundableFlag: row.refundableFlag,
        nightlyRate: soldOut ? 0 : Number(row.nightlyRate),
        currency: row.currency,
        availabilityStatus: row.availabilityStatus,
        sourceHotelName: row.hotelName,
        sourceHotelCode: null,
        uniqueKey,
        uploadBatchId: batch.id,
        createdById: actorId,
        updatedById: actorId,
      },
      update: {
        uniqueKey,
        nightlyRate: soldOut ? 0 : Number(row.nightlyRate),
        availabilityStatus: row.availabilityStatus,
      },
    });
  }

  const existingKeys = new Set<string>();
  const keys = candidates.map((c) => c.uniqueKey);
  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const found = await prisma.rateObservation.findMany({
      where: { uniqueKey: { in: chunk } },
      select: { uniqueKey: true },
    });
    found.forEach((row) => existingKeys.add(row.uniqueKey));
  }

  const toCreate: Prisma.RateObservationCreateManyInput[] = [];
  const toUpdate: Array<{ uniqueKey: string; nightlyRate: number; availabilityStatus: string | null }> = [];

  for (const candidate of candidates) {
    if (existingKeys.has(candidate.uniqueKey)) {
      skipped += 1;
      skipReasons.existing += 1;
      continue;
    }
    toCreate.push(candidate.create);
  }

  const createResult = toCreate.length
    ? await prisma.rateObservation.createMany({ data: toCreate, skipDuplicates: true })
    : { count: 0 };

  for (const row of toUpdate) {
    await prisma.rateObservation.update({
      where: { uniqueKey: row.uniqueKey },
      data: {
        nightlyRate: row.nightlyRate,
        availabilityStatus: row.availabilityStatus,
        uploadBatchId: batch.id,
        updatedById: actorId,
      },
    });
  }

  const inserted = createResult.count;
  const updated = toUpdate.length;

  const summary = {
    inserted,
    updated,
    skipped,
    totalRows: validation.summary.totalRows,
    validRows: validation.summary.validRows,
    skipReasons,
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

export async function convertRateGridToValidation(
  input: {
    uploadBatchId: string;
    year?: number;
    currencyDefault?: string;
    autoAddUnresolvedHotels?: boolean;
  },
  actorId: string,
) {
  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id: input.uploadBatchId },
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      fileBlob: true,
      selectedSheet: true,
      compSetId: true,
      createdAt: true,
      sourceName: true,
      subjectHotel: { select: { id: true, name: true } },
    },
  });

  if (!batch.selectedSheet) {
    throw new Error("Select a sheet first.");
  }

  const captureDate = startOfDay(new Date());
  if (Number.isNaN(captureDate.getTime())) {
    throw new Error("Invalid capture date.");
  }
  const yearFallback = input.year && Number.isFinite(input.year) ? input.year : captureDate.getFullYear();
  const currencyDefault = (input.currencyDefault ?? "USD").trim() || "USD";

  const buffer = await readUploadBatchBuffer(batch);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const worksheet = workbook.Sheets[batch.selectedSheet];
  if (!worksheet) {
    throw new Error(`Sheet not found: ${batch.selectedSheet}`);
  }

  const transformed = extractRateGridObservations(worksheet, { yearFallback, captureDate });

  const namesInFile = [
    ...new Set(
      transformed
        .map((row) => row.hotelName || "")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const normalizedNamesInFile = new Set(namesInFile.map((name) => normalizeHotelName(name)));
  const normalizedSubjectHotel = normalizeHotelName(batch.subjectHotel.name);
  const namesToAutoAdd = namesInFile.filter((name) => {
    const normalizedName = normalizeHotelName(name);
    if (normalizedName === normalizedSubjectHotel) return false;
    if (isMarketAverageRow(name)) return false;
    return true;
  });

  // Ensure compset contains all hotels seen in the grid (no manual hotel profiles needed)
  let autoAddedHotels = 0;
  if (input.autoAddUnresolvedHotels === true && namesToAutoAdd.length) {
    const result = await addHotelsToCompSet({ compSetId: batch.compSetId, hotelNames: namesToAutoAdd }, actorId);
    autoAddedHotels = result.addedMembers;
  }

  const members = await prisma.compSetMember.findMany({
    where: { compSetId: batch.compSetId },
    select: { hotelId: true, roleType: true, hotel: { select: { id: true, name: true } } },
  });

  const hotelLookup = new Map<string, { id: string; name: string }>();
  members.forEach((member) => {
    hotelLookup.set(normalizeHotelName(member.hotel.name), { id: member.hotel.id, name: member.hotel.name });
  });

  const unresolved = new Set<string>();
  const rows = transformed.map((row) => {
    const normalizedRowHotel = normalizeHotelName(row.hotelName);
    const matched = hotelLookup.get(normalizedRowHotel);
    const matchedHotelId = matched?.id ?? null;
    const matchedHotelName = matched?.name ?? null;
    const errors = [...row.errors];
    if (row.hotelName && !matchedHotelId) {
      unresolved.add(row.hotelName);
      errors.push("Hotel not found in compset.");
    }
    return {
      ...row,
      matchedHotelId,
      matchedHotelName,
      currency: row.currency ?? currencyDefault,
      stayDate: row.stayDate ? row.stayDate.toISOString() : null,
      captureDate: row.captureDate ? row.captureDate.toISOString() : null,
      errors,
      duplicateInFile: false,
    };
  });

  const matchedHotels = new Set(
    rows
      .map((row) => row.matchedHotelName ?? "")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const subjectHotelObservedInFile = normalizedNamesInFile.has(normalizedSubjectHotel);
  const missingCompSetHotelsInFile = members
    .filter((member) => member.roleType === "COMP")
    .filter((member) => !isMarketAverageRow(member.hotel.name))
    .filter((member) => !normalizedNamesInFile.has(normalizeHotelName(member.hotel.name)))
    .map((member) => member.hotel.name);

  const validationMessages: string[] = [];
  if (!subjectHotelObservedInFile) {
    validationMessages.push(`Main property "${batch.subjectHotel.name}" does not exist in the Excel file.`);
  }
  if (missingCompSetHotelsInFile.length > 0) {
    validationMessages.push(
      `These compset hotels are missing in the Excel file: ${missingCompSetHotelsInFile.join(", ")}.`,
    );
  }

  const validRows = rows.filter((row) => row.errors.length === 0 && row.matchedHotelId);
  const validation = {
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: rows.filter((row) => row.errors.length > 0).length,
      duplicatesInFile: 0,
      unresolvedHotels: [...unresolved],
      autoAddedHotels,
      captureDate: formatISO(captureDate, { representation: "date" }),
      yearFallback,
      fileHotels: namesInFile.length,
      matchedHotels: matchedHotels.size,
      subjectHotelObservedInFile,
      missingCompSetHotelsInFile,
      validationMessages,
      subjectAliasName: null,
    },
    rows,
    mapping: { format: "RATE_GRID" },
    normalization: { currencyDefault },
  };

  await prisma.uploadBatch.update({
    where: { id: batch.id },
    data: {
      validationJson: validation,
      mappingJson: { format: "RATE_GRID" },
      status: "VALIDATED",
      updatedById: actorId,
    },
  });

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: batch.id,
    action: "VALIDATED",
    metadata: validation.summary,
  });

  return validation;
}

export async function deleteUploadBatch(id: string, actorId: string) {
  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id },
    select: { id: true, fileName: true, storagePath: true },
  });

  await prisma.$transaction([
    prisma.rateObservation.deleteMany({ where: { uploadBatchId: id } }),
    prisma.uploadBatch.delete({ where: { id } }),
  ]);

  if (batch.storagePath) {
    await deleteFileFromPath(batch.storagePath);
  }

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: id,
    action: "DELETED",
    message: `Deleted upload batch ${batch.fileName}`,
  });

  return { success: true };
}

export async function updateUploadBatchFile(
  id: string,
  input: {
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    fileBuffer: Buffer;
    keepSettings?: boolean;
  },
  actorId: string,
) {
  validateUploadFile({ name: input.fileName, type: input.fileType, size: input.fileSizeBytes });
  
  const batch = await prisma.uploadBatch.findUniqueOrThrow({
    where: { id },
    select: { 
      id: true, 
      storagePath: true, 
      selectedSheet: true, 
      mappingJson: true,
    },
  });

  // Delete old file if it exists
  if (batch.storagePath) {
    await deleteFileFromPath(batch.storagePath);
  }

  // Delete old observations
  await prisma.rateObservation.deleteMany({
    where: { uploadBatchId: id },
  });

  const safeFileName = sanitizeFileName(input.fileName);
  const storagePath = getUploadPath(`${id}-${safeFileName}`);
  await saveBufferToPath(storagePath, input.fileBuffer);
  
  const sheets = parseWorkbookBuffer(input.fileBuffer, safeFileName);
  const workbookMeta = getWorkbookMeta(sheets);
  const sheetNames = (workbookMeta as { sheetNames?: string[] })?.sheetNames ?? [];
  
  const stillHasSheet = batch.selectedSheet && sheetNames.includes(batch.selectedSheet);

  const updated = await prisma.uploadBatch.update({
    where: { id },
    data: {
      fileName: safeFileName,
      fileType: input.fileType,
      fileSizeBytes: input.fileSizeBytes,
      storagePath,
      workbookMetaJson: workbookMeta,
      status: "DRAFT",
      // Reset processing state if we can't keep settings or if not requested
      selectedSheet: input.keepSettings && stillHasSheet ? batch.selectedSheet : null,
      mappingJson: input.keepSettings && stillHasSheet ? batch.mappingJson ?? Prisma.JsonNull : Prisma.DbNull,
      previewJson: Prisma.DbNull,
      validationJson: Prisma.DbNull,
      summaryJson: Prisma.DbNull,
      updatedById: actorId,
    },
  });

  await logActivity({
    actorId,
    entityType: "UploadBatch",
    entityId: id,
    action: "UPDATED",
    message: `Re-uploaded file for ${safeFileName}${input.keepSettings ? " (kept settings)" : ""}`,
  });

  return updated;
}

