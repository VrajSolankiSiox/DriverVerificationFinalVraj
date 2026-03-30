import { z } from "zod";

export const hotelSchema = z.object({
  name: z.string().min(2),
  brand: z.string().optional().nullable(),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().optional().nullable(),
  country: z.string().min(2),
  websiteUrl: z.string().url().optional().or(z.literal("")).nullable(),
  bookingUrl: z.string().url().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  roomCount: z.coerce.number().int().positive().optional().nullable(),
  starLevel: z.coerce.number().min(1).max(5).optional().nullable(),
  ownershipNotes: z.string().optional().nullable(),
  managementNotes: z.string().optional().nullable(),
});

export type HotelInput = z.infer<typeof hotelSchema>;
