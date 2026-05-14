import { z } from "zod";

export const demoCreateSchema = z.object({
  hotelId: z.string().min(1),
  hotelName: z.string().min(1),
  hotelOwnerName: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  outcome: z.enum(["PENDING", "NO_SHOW", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional().default("PENDING"),
  conductedBy: z.string().optional().nullable(),
  demoDate: z.string().optional().nullable(),
  ownerFeedback: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
  uploadBatchId: z.string().optional().nullable(),
  reportId: z.string().optional().nullable(),
});

export const demoUpdateSchema = demoCreateSchema.extend({
  id: z.string().min(1),
});
