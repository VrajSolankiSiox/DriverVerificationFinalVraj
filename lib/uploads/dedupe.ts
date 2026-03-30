import { format } from "date-fns";

import type { RateObservationInput } from "@/lib/types";

function normalizeNullable(value?: string | boolean | null) {
  if (value === undefined || value === null || value === "") {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return value.trim().toLowerCase();
}

export function buildRateObservationKey(input: RateObservationInput) {
  return [
    input.hotelId,
    format(input.stayDate, "yyyy-MM-dd"),
    format(input.captureDate, "yyyy-MM-dd"),
    normalizeNullable(input.roomType ?? null),
    normalizeNullable(input.ratePlan ?? null),
    normalizeNullable(input.refundableFlag ?? null),
    normalizeNullable(input.currency),
  ].join("|");
}
