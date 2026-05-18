import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { convertRateGridToValidation, importUploadBatch } from "@/lib/services/uploads";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const formData = await request.formData();
    const year = Number(formData.get("year") ?? "");

    const validation = await convertRateGridToValidation(
      {
        uploadBatchId: id,
        year: Number.isFinite(year) ? year : undefined,
        autoAddUnresolvedHotels: false,
      },
      user.id,
    );
    const summary = validation.summary as {
      subjectHotelObservedInFile?: boolean;
      validationMessages?: string[];
    };

    if (summary.subjectHotelObservedInFile === false) {
      return NextResponse.json(
        {
          error:
            summary.validationMessages?.[0] ??
            "Main property does not exist in the Excel file. Import has been blocked.",
          summary,
        },
        { status: 400 },
      );
    }

    const batch = await prisma.uploadBatch.findUniqueOrThrow({
      where: { id },
      select: { importMode: true },
    });

    await importUploadBatch(
      {
        uploadBatchId: id,
        mode: batch.importMode === "APPEND_NEW" ? "APPEND_NEW" : "APPEND_NEW",
      },
      user.id,
    );

    return NextResponse.redirect(new URL(`/uploads/${id}`, request.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert rate grid" },
      { status: 400 },
    );
  }
}
