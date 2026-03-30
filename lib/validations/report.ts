import { z } from "zod";

export const reportCreateSchema = z.object({
  name: z.string().min(2),
  subjectHotelId: z.string().min(1),
  compSetId: z.string().min(1),
});

export const reportUpdateSchema = z.object({
  reportId: z.string().min(1),
  executiveSummary: z.string().optional().nullable(),
  manualOpportunityNotes: z.string().optional().nullable(),
  methodologyNote: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "REVIEW_READY", "APPROVED", "EXPORTED"]).optional(),
  sectionOrder: z.array(z.object({
    id: z.string().min(1),
    displayOrder: z.coerce.number().int().min(0),
    enabled: z.boolean(),
    visibility: z.enum(["CLIENT_SAFE", "INTERNAL_ONLY"]),
  })).optional(),
});
