import { z } from "zod";

export const compsetMemberSchema = z.object({
  hotelId: z.string().min(1),
  roleType: z.enum(["SUBJECT", "COMP"]),
  displayOrder: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable(),
});

export const compsetHotelRowSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  expediaLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const compsetSchema = z.object({
  name: z.string().trim().min(2, "Compset name must be at least 2 characters"),
  expediaUrl: z.string().url("Must be a valid Expedia URL").optional().or(z.literal("")),
  subjectHotelId: z.string().min(1, "Subject hotel is required"),
  compHotels: z.array(compsetHotelRowSchema).min(1, "At least one comp hotel is required").max(10, "Maximum 10 comp hotels allowed"),
});
