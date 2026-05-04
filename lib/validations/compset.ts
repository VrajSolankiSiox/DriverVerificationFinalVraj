import { z } from "zod";

export const OTA_PLATFORMS = [
  "Expedia",
  "Booking.com",
  "Agoda",
  "Priceline",
  "Google Business",
  "TripAdvisor",
] as const;

export type OtaPlatform = (typeof OTA_PLATFORMS)[number];

export const compsetMemberSchema = z.object({
  hotelId: z.string().min(1),
  roleType: z.enum(["SUBJECT", "COMP"]),
  displayOrder: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable(),
});

export const compsetHotelRowSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  websiteUrl: z.string().url("Must be a valid website URL").optional().or(z.literal("")),
  bookingUrl: z.string().url("Must be a valid booking URL").optional().or(z.literal("")),
  expediaLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  // keyed by platform name, value is rating 0-10 or empty string
  otaRatings: z.record(
    z.string(),
    z.union([z.coerce.number().min(0).max(10), z.literal("")])
  ).optional(),
});

export const compsetSchema = z.object({
  name: z.string().trim().min(2, "Compset name must be at least 2 characters"),
  expediaUrl: z.string().url("Must be a valid Expedia URL").optional().or(z.literal("")),
  subjectHotelId: z.string().min(1, "Main property is required"),
  compHotels: z
    .array(compsetHotelRowSchema)
    .min(1, "At least one comp hotel is required")
    .max(10, "Maximum 10 comp hotels allowed"),
});
