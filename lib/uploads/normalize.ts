import { parse, parseISO, isValid } from "date-fns";

export function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const next = String(value).trim();
  return next.length ? next : null;
}

export function normalizeCurrency(value: unknown, fallback = "USD") {
  const text = normalizeText(value);
  if (!text) {
    return fallback;
  }
  return text.replace(/[^A-Za-z]/g, "").toUpperCase() || fallback;
}

export function normalizeNumber(
  value: unknown,
  options: { stripCurrencySymbols?: boolean; stripCommas?: boolean } = {},
) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  let normalized = text;
  if (options.stripCurrencySymbols ?? true) {
    normalized = normalized.replace(/[₹$€£]/g, "");
  }
  if (options.stripCommas ?? true) {
    normalized = normalized.replace(/,/g, "");
  }

  const valueNumber = Number(normalized);
  return Number.isFinite(valueNumber) ? valueNumber : null;
}

export function normalizeBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return null;
  }
  if (["true", "yes", "y", "1", "refund", "refundable"].includes(text)) {
    return true;
  }
  if (["false", "no", "n", "0", "nonref", "non-refundable", "non refundable"].includes(text)) {
    return false;
  }
  return null;
}

export function parseFlexibleDate(value: unknown, explicitFormat?: string | null) {
  if (value instanceof Date && isValid(value)) {
    return value;
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  if (explicitFormat) {
    const parsed = parse(text, explicitFormat, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const formats = [
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "MMM d, yyyy",
    "d MMM yyyy",
  ];

  const iso = parseISO(text);
  if (isValid(iso)) {
    return iso;
  }

  for (const formatString of formats) {
    const parsed = parse(text, formatString, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const fallback = new Date(text);
  return isValid(fallback) ? fallback : null;
}
