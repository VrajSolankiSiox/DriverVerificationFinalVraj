import { z } from "zod";

export const OTA_PLATFORMS = [
  "Google",
  "Expedia",
  "Booking",
  "Agoda",
  "Priceline",
  "TripAdvisor",
] as const;

export type OtaPlatform = (typeof OTA_PLATFORMS)[number];

export const compsetRatingInputPattern = /^\s*(?:10(?:\.0)?|[0-9](?:\.[0-9])?)\s*\(\s*[0-9]+\s*\)\s*$/;
export const compsetRatingOrXInputPattern = /^\s*(?:X|x|10(?:\.0)?|[0-9](?:\.[0-9])?)\s*(?:\(\s*[0-9]+\s*\))?\s*$/;
export const compsetOrganicOrXInputPattern = /^\s*(?:X|x|[1-9][0-9]*)\s*$/;

export const compsetMemberSchema = z.object({
  hotelId: z.string().min(1),
  roleType: z.enum(["SUBJECT", "COMP"]),
  displayOrder: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable(),
});

export const compsetHotelRowSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  starRating: z.union([
    z.coerce.number().min(0, "Star rating must be 0 or higher.").max(5, "Star rating must be 5 or lower."),
    z.literal("X"),
    z.literal("x")
  ]),
  roomCount: z.coerce.number().int().positive("Room count must be greater than 0."),
  ratings: z.object({
    google: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`."),
    expedia: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`."),
    booking: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`."),
    agoda: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`."),
    priceline: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`."),
    tripadvisor: z
      .string()
      .trim()
      .regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`.")
      .optional()
      .default("X"),
  }),
  organicSearchPositions: z.object({
    expedia: z.string().trim().regex(compsetOrganicOrXInputPattern, "Use positive number or `X`."),
    bookingCom: z.string().trim().regex(compsetOrganicOrXInputPattern, "Use positive number or `X`."),
    priceline: z.string().trim().regex(compsetOrganicOrXInputPattern, "Use positive number or `X`."),
    google: z.string().trim().regex(compsetOrganicOrXInputPattern, "Use positive number or `X`."),
  }),
});

export const compsetSchema = z.object({
  name: z.string().trim().min(2, "Compset name must be at least 2 characters"),
  subjectHotelId: z.string().min(1, "Main property is required"),
  compHotels: z
    .array(compsetHotelRowSchema)
    .min(1, "At least one comp hotel is required")
    .max(20, "Maximum 20 comp hotels allowed"),
});

