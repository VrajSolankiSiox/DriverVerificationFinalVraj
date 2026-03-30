import { z } from "zod";

export const compsetMemberSchema = z.object({
  hotelId: z.string().min(1),
  roleType: z.enum(["SUBJECT", "COMP"]),
  displayOrder: z.coerce.number().int().min(0),
  notes: z.string().optional().nullable(),
});

export const compsetSchema = z.object({
  name: z.string().min(2),
  subjectHotelId: z.string().min(1),
  version: z.coerce.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
  memberHotelIds: z.array(z.string().min(1)).min(1),
});
