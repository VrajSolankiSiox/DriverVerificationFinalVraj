import { z } from "zod";

const manualRateInputSchema = z.object({
  hotelId: z.string().min(1),
  date: z.string().min(1, "Date is required."),
  nightlyRate: z.coerce.number().positive("Rate must be greater than 0."),
});

export const reportCreateSchema = z
  .object({
    name: z.string().min(2),
    subjectHotelId: z.string().min(1),
    compSetId: z.string().min(1),
    dataSource: z.enum(["UPLOAD", "MANUAL"]).default("UPLOAD"),
    includeSeoComparison: z.boolean().optional().default(true),
    uploadBatchId: z.string().optional(),
    manualRates: z.array(manualRateInputSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dataSource === "UPLOAD") {
      if (!value.uploadBatchId || value.uploadBatchId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uploadBatchId"],
          message: "Select an imported upload batch.",
        });
      }
      return;
    }

    if (!value.manualRates || value.manualRates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manualRates"],
        message: "Add at least one manual rate entry.",
      });
    }
  });

export const reportUpdateSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["DRAFT", "REVIEW_READY", "APPROVED", "EXPORTED"]).optional(),
  sectionOrder: z.array(z.object({
    id: z.string().min(1),
    displayOrder: z.coerce.number().int().min(0),
    enabled: z.boolean(),
    visibility: z.enum(["CLIENT_SAFE", "INTERNAL_ONLY"]),
  })).optional(),
});
