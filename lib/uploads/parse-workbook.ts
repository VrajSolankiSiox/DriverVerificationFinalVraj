import * as XLSX from "xlsx";

import type { UploadWorkbookSheet } from "@/lib/types";

export function parseWorkbookBuffer(buffer: Buffer, fileName: string): UploadWorkbookSheet[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
    dense: false,
  });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return {
      name: sheetName,
      headers,
      rows: rows.slice(0, 1000),
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
