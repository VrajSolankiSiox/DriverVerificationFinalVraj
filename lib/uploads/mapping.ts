import { logicalUploadFields } from "@/lib/constants";
import type { UploadMapping } from "@/lib/types";
import { normalizeBooleanLike, normalizeCurrency, normalizeNumber, normalizeText, parseFlexibleDate } from "@/lib/uploads/normalize";

export type TransformedUploadRow = {
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
};

export function buildDefaultMapping(headers: string[]) {
  const mapping: UploadMapping = {};
  for (const field of logicalUploadFields) {
    const match = headers.find((header) =>
      header.toLowerCase().replace(/[^a-z0-9]/g, "").includes(field.key.replace(/[^a-z0-9]/g, "")),
    );
    mapping[field.key] = match ?? null;
  }
  return mapping;
}

export function transformSheetRows(
  rows: Record<string, string>[],
  mapping: UploadMapping,
  normalization: {
    dateFormat?: string | null;
    currencyDefault?: string | null;
    stripCurrencySymbols?: boolean;
    stripCommas?: boolean;
  },
) {
  const transformed: TransformedUploadRow[] = [];

  rows.forEach((row, index) => {
    const get = (logicalField: string) => {
      const sourceColumn = mapping[logicalField];
      return sourceColumn ? row[sourceColumn] : null;
    };

    const hotelName = normalizeText(get("hotel_name"));
    const hotelCode = normalizeText(get("hotel_code"));
    const stayDate = parseFlexibleDate(get("stay_date"), normalization.dateFormat ?? undefined);
    const captureDate =
      parseFlexibleDate(get("capture_date"), normalization.dateFormat ?? undefined) ||
      parseFlexibleDate(get("file_date"), normalization.dateFormat ?? undefined) ||
      null;
    const nightlyRate = normalizeNumber(get("nightly_rate"), {
      stripCurrencySymbols: normalization.stripCurrencySymbols,
      stripCommas: normalization.stripCommas,
    });
    const currency = normalizeCurrency(get("currency"), normalization.currencyDefault ?? "USD");
    const rowErrors: string[] = [];

    if (!hotelName && !hotelCode) {
      rowErrors.push("Hotel name or hotel code is required.");
    }
    if (!stayDate) {
      rowErrors.push("Stay date is required.");
    }
    if (!captureDate) {
      rowErrors.push("Capture date or file date is required.");
    }
    if (nightlyRate === null) {
      rowErrors.push("Nightly rate is required and must be numeric.");
    }
    if (!currency) {
      rowErrors.push("Currency is required.");
    }

    transformed.push({
      rowNumber: index + 2,
      hotelName,
      hotelCode,
      stayDate,
      captureDate,
      roomType: normalizeText(get("room_type")),
      ratePlan: normalizeText(get("rate_plan")),
      refundableFlag: normalizeBooleanLike(get("refundable_flag")),
      nightlyRate,
      currency,
      availabilityStatus: normalizeText(get("occupancy_or_availability_status")),
      errors: rowErrors,
    });
  });

  return transformed.filter((row) => {
    const isBlank = !row.hotelName && !row.hotelCode && !row.stayDate && row.nightlyRate === null;
    return !isBlank;
  });
}

export function validateMapping(mapping: UploadMapping) {
  const required = logicalUploadFields.filter((field) => field.required);
  const missing = required.filter((field) => !mapping[field.key]);
  return {
    valid: missing.length === 0,
    missing,
  };
}
