import { z } from "zod";
import { compsetRatingOrXInputPattern } from "@/lib/validations/compset";

const reviewResponsePlatforms = ["google", "expedia", "booking", "tripadvisor"] as const;

export const hotelSchema = z.object({
  name: z.string().trim().min(2),
  brand: z.string().optional().nullable(),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().optional().nullable(),
  country: z.string().min(2),
  websiteUrl: z.string().url().optional().or(z.literal("")).nullable(),
  bookingUrl: z.string().url().optional().or(z.literal("")).nullable(),
  ownerName: z.string().optional().nullable(),
  salesPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  roomCount: z.coerce.number().int().positive().optional().nullable(),
  starLevel: z.union([
    z.coerce.number().min(1).max(5),
    z.literal("X"),
    z.literal("x")
  ]).optional().nullable(),
  ownershipNotes: z.string().optional().nullable(),
  managementNotes: z.string().optional().nullable(),
  reviewResponded: z.boolean().optional().default(false),
  reviewResponseScreenshots: z
    .record(
      z.enum(reviewResponsePlatforms),
      z.string().optional().nullable(),
    )
    .optional(),
  reviewResponsePresence: z
    .record(
      z.enum(reviewResponsePlatforms),
      z.enum(["RESPONDED", "NOT_RESPONDED", "NO_PRESENCE", "NO_REVIEW"]),
    )
    .optional(),
  // OTA platform ratings: keyed by platform name, accepts `9.5 (200)` or `X`
  otaRatings: z
    .record(
      z.string(),
      z.string().trim().regex(compsetRatingOrXInputPattern, "Use `9.5 (200)` or `X`.")
    )
    .optional(),
  organicSearchPositions: z
    .object({
      google: z.union([z.coerce.number().int().positive(), z.literal(""), z.literal("X"), z.literal("x")]).optional(),
      expedia: z.union([z.coerce.number().int().positive(), z.literal(""), z.literal("X"), z.literal("x")]).optional(),
      bookingCom: z.union([z.coerce.number().int().positive(), z.literal(""), z.literal("X"), z.literal("x")]).optional(),
      priceline: z.union([z.coerce.number().int().positive(), z.literal(""), z.literal("X"), z.literal("x")]).optional(),
    })
    .optional(),
});

export type HotelInput = z.infer<typeof hotelSchema>;
