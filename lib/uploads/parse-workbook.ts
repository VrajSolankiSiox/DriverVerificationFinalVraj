import * as XLSX from "xlsx";

import type { UploadWorkbookSheet } from "@/lib/types";

const EMPTY_HEADER_VALUES = new Set(["", "none", "null", "__empty", "__empty_1", "__empty_2"]);

function normalizeCellValue(value: unknown) {
  return String(value ?? "").trim();
}

function isDateLikeHeader(value: string) {
  const text = value.trim();
  if (!text) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return true;
  if (/^\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?$/.test(text)) return true;
  if (/^\d{1,2}[-/ ]?[A-Za-z]{3}(?:[-/ ]\d{2,4})?$/.test(text)) return true;
  return false;
}

function isNumericLikeCell(value: string) {
  const text = value.trim();
  if (!text) return false;
  const cleaned = text.replace(/[$,]/g, "");
  return /^[-+]?\d+(?:\.\d+)?$/.test(cleaned);
}
function scoreHeaderRow(row: string[]) {
  const nonEmpty = row.filter((cell) => cell.length > 0);
  if (nonEmpty.length < 2) return -1;

  const dateLikeCount = row.slice(1).filter((cell) => isDateLikeHeader(cell)).length;
  const hasHotelKeyword = row.some((cell) => /\bhotel\b/i.test(cell));
  const headerKeywordCount = row.filter((cell) =>
    /\b(hotel|name|date|rate|room|currency|code|refundable|availability|status)\b/i.test(cell),
  ).length;
  const numericLikeCount = row.filter((cell) => /^[-+]?\d+(?:\.\d+)?$/.test(cell)).length;
  const alphaCount = row.filter((cell) => /[A-Za-z]/.test(cell)).length;

  // Prefer rows that look like "hotel name + many stay-date columns".
  return (
    dateLikeCount * 4 +
    (hasHotelKeyword ? 3 : 0) +
    headerKeywordCount * 3 +
    alphaCount +
    nonEmpty.length -
    numericLikeCount * 2
  );
}

function dedupeHeaderNames(headers: string[]) {
  const counts = new Map<string, number>();
  return headers.map((header) => {
    const current = counts.get(header) ?? 0;
    counts.set(header, current + 1);
    if (current === 0) return header;
    return `${header} (${current + 1})`;
  });
}

function chooseHeaderRow(rows: string[][]) {
  const maxScan = Math.min(rows.length, 25);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < maxScan; i += 1) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function getEffectiveWorksheetRange(worksheet: XLSX.WorkSheet) {
  const cellEntries = Object.entries(worksheet).filter(([address, cell]) => {
    if (address.startsWith("!")) return false;
    if (!cell || typeof cell !== "object") return false;
    const typedCell = cell as XLSX.CellObject;
    const rawValue = normalizeCellValue(typedCell.v);
    const displayValue = normalizeCellValue(typedCell.w);
    return rawValue.length > 0 || displayValue.length > 0;
  });

  if (!cellEntries.length) {
    return worksheet["!ref"] ?? "A1:A1";
  }

  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (const [address] of cellEntries) {
    const decoded = XLSX.utils.decode_cell(address);
    if (decoded.r < minRow) minRow = decoded.r;
    if (decoded.r > maxRow) maxRow = decoded.r;
    if (decoded.c < minCol) minCol = decoded.c;
    if (decoded.c > maxCol) maxCol = decoded.c;
  }

  return XLSX.utils.encode_range({
    s: { r: minRow, c: minCol },
    e: { r: maxRow, c: maxCol },
  });
}

function detectMissingLeadingHotelHeader(headerRow: string[], firstDataRow: string[] | undefined) {
  const dateHeaderCount = headerRow.filter((cell) => isDateLikeHeader(cell)).length;
  if (dateHeaderCount < 2) return false;
  if (!isDateLikeHeader(headerRow[0] ?? "")) return false;
  if (!firstDataRow) return false;

  const firstDataCell = normalizeCellValue(firstDataRow[0]);
  const secondDataCell = normalizeCellValue(firstDataRow[1]);
  const firstLooksLikeName = /[A-Za-z]/.test(firstDataCell) && !isDateLikeHeader(firstDataCell);
  const secondLooksLikeRate = isNumericLikeCell(secondDataCell);

  // Header starts with a date but data starts with hotel-like text.
  return firstLooksLikeName && (secondLooksLikeRate || firstDataRow.length > headerRow.length);
}

function getCellText(worksheet: XLSX.WorkSheet, row: number, col: number) {
  const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined;
  if (!cell) return "";
  if (typeof cell.w === "string" && cell.w.trim()) {
    return normalizeCellValue(cell.w);
  }
  return normalizeCellValue(cell.v);
}

function looksLikeDow(value: string) {
  const text = value.trim().toLowerCase();
  return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(text);
}

function parseRateGridWorksheet(worksheet: XLSX.WorkSheet) {
  const effectiveRange = getEffectiveWorksheetRange(worksheet);
  const range = XLSX.utils.decode_range(effectiveRange);
  const scanStartCol = 0;

  let headerRow = range.s.r;
  let dateCols: number[] = [];

  const scanMax = Math.min(range.e.r, range.s.r + 25);
  for (let r = range.s.r; r <= scanMax; r += 1) {
    const cols: number[] = [];
    for (let c = scanStartCol; c <= range.e.c; c += 1) {
      const text = getCellText(worksheet, r, c);
      if (isDateLikeHeader(text)) {
        cols.push(c);
      }
    }
    if (cols.length > dateCols.length) {
      headerRow = r;
      dateCols = cols;
    }
  }

  if (dateCols.length < 2) {
    return null;
  }

  const firstDateCol = Math.min(...dateCols);
  const nameCol = firstDateCol - 1;
  if (nameCol < 0) {
    return null;
  }

  const dowRow = headerRow + 1;
  let dataStartRow = headerRow + 1;
  const dowCount = dateCols.filter((c) => looksLikeDow(getCellText(worksheet, dowRow, c))).length;
  if (dowCount >= Math.ceil(dateCols.length * 0.6)) {
    dataStartRow = headerRow + 2;
  }

  const inspectMax = Math.min(range.e.r, dataStartRow + 20);
  let nameLikeCount = 0;
  for (let r = dataStartRow; r <= inspectMax; r += 1) {
    const name = getCellText(worksheet, r, nameCol);
    if (/[A-Za-z]/.test(name) && !isNumericLikeCell(name) && !isDateLikeHeader(name)) {
      nameLikeCount += 1;
    }
  }

  if (nameLikeCount < 2) {
    return null;
  }

  const dateHeaders = dateCols.map((c) => getCellText(worksheet, headerRow, c) || `Column ${c + 1}`);
  const headers = dedupeHeaderNames(["Hotel Name", ...dateHeaders]);

  const parsedRows: Record<string, string>[] = [];
  for (let r = dataStartRow; r <= range.e.r; r += 1) {
    const hotelName = getCellText(worksheet, r, nameCol);
    if (!hotelName) continue;

    const row: Record<string, string> = { [headers[0]]: hotelName };
    let hasRateValue = false;
    dateCols.forEach((col, index) => {
      const value = getCellText(worksheet, r, col);
      row[headers[index + 1]] = value;
      if (value) hasRateValue = true;
    });

    if (hasRateValue) {
      parsedRows.push(row);
    }
  }

  if (!parsedRows.length) {
    return null;
  }

  return { headers, rows: parsedRows.slice(0, 1000) };
}

function parseWorksheet(worksheet: XLSX.WorkSheet) {
  const effectiveRange = getEffectiveWorksheetRange(worksheet);
  const rangeObj = XLSX.utils.decode_range(effectiveRange);
  const normalizedRange = XLSX.utils.encode_range({
    s: { r: rangeObj.s.r, c: 0 },
    e: rangeObj.e,
  });
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
    range: normalizedRange,
  });

  const rows = matrix.map((row) => row.map((cell) => normalizeCellValue(cell)));
  if (!rows.length) {
    return { headers: [], rows: [] as Record<string, string>[] };
  }

  const headerRowIndex = chooseHeaderRow(rows);
  const headerRow = rows[headerRowIndex] ?? [];
  const firstDataRow = rows.slice(headerRowIndex + 1).find((row) => row.some((cell) => Boolean(cell)));
  const missingLeadingHotelHeader = detectMissingLeadingHotelHeader(headerRow, firstDataRow);

  const maxColumns = rows.reduce((largest, row) => Math.max(largest, row.length), 0);
  const candidateDateHeaders = missingLeadingHotelHeader ? headerRow : headerRow.slice(1);
  const hasDateColumns = candidateDateHeaders.filter((cell) => isDateLikeHeader(cell)).length >= 2;

  const rawHeaders = Array.from({ length: maxColumns }, (_, columnIndex) => {
    if (missingLeadingHotelHeader) {
      if (columnIndex === 0) {
        return "Hotel Name";
      }
      const shiftedHeaderValue = normalizeCellValue(headerRow[columnIndex - 1]);
      const normalizedShifted = shiftedHeaderValue.toLowerCase();
      if (EMPTY_HEADER_VALUES.has(normalizedShifted)) {
        return `Column ${columnIndex + 1}`;
      }
      return shiftedHeaderValue;
    }

    const headerValue = normalizeCellValue(headerRow[columnIndex]);
    const normalizedHeader = headerValue.toLowerCase();

    if (EMPTY_HEADER_VALUES.has(normalizedHeader)) {
      if (columnIndex === 0 && hasDateColumns) {
        return "Hotel Name";
      }
      return `Column ${columnIndex + 1}`;
    }

    return headerValue;
  });

  const headers = dedupeHeaderNames(rawHeaders);

  const parsedRows: Record<string, string>[] = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const record: Record<string, string> = {};
    let hasData = false;

    headers.forEach((header, columnIndex) => {
      const value = normalizeCellValue(row[columnIndex]);
      record[header] = value;
      if (value) {
        hasData = true;
      }
    });

    if (hasData) {
      parsedRows.push(record);
    }
  }

  return { headers, rows: parsedRows.slice(0, 1000) };
}

export function parseWorkbookBuffer(buffer: Buffer, fileName: string): UploadWorkbookSheet[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
    dense: false,
  });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const parsedSheet = parseRateGridWorksheet(worksheet) ?? parseWorksheet(worksheet);
    return {
      name: sheetName,
      headers: parsedSheet.headers,
      rows: parsedSheet.rows,
    };
  });
}

export function previewSheetRows(sheet: UploadWorkbookSheet, limit = 25) {
  return sheet.rows.slice(0, limit);
}

export function getWorkbookMeta(sheets: UploadWorkbookSheet[]) {
  return {
    sheetNames: sheets.map((sheet) => sheet.name),
    rowCounts: Object.fromEntries(sheets.map((sheet) => [sheet.name, sheet.rows.length])),
  };
}

export function getSheetByName(sheets: UploadWorkbookSheet[], selectedSheet: string) {
  const sheet = sheets.find((item) => item.name === selectedSheet);
  if (!sheet) {
    throw new Error(`Sheet not found: ${selectedSheet}`);
  }
  return sheet;
}
