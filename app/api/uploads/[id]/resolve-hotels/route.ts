import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addHotelsToCompSet } from "@/lib/services/compsets";
import { validateUploadBatch } from "@/lib/services/uploads";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const batch = await prisma.uploadBatch.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        sourceName: true,
        compSetId: true,
        mappingJson: true,
        validationJson: true,
      },
    });

    const validation = batch.validationJson as {
      summary?: { unresolvedHotels?: string[] };
      mapping?: Record<string, string | null>;
      normalization?: {
        dateFormat?: string | null;
        currencyDefault?: string | null;
        stripCurrencySymbols?: boolean;
        stripCommas?: boolean;
      };
    } | null;

    const unresolved = validation?.summary?.unresolvedHotels ?? [];
    if (!unresolved.length) {
      return NextResponse.redirect(new URL(`/uploads/${id}`, request.url));
    }

    await addHotelsToCompSet({ compSetId: batch.compSetId, hotelNames: unresolved }, user.id);

    const mapping =
      (validation?.mapping as Record<string, string | null> | undefined) ??
      (batch.mappingJson as Record<string, string | null> | undefined);

    if (mapping && validation?.normalization) {
      await validateUploadBatch(
        {
          uploadBatchId: id,
          sourceName: batch.sourceName,
          mapping,
          normalization: validation.normalization,
        },
        user.id,
      );
    }

    return NextResponse.redirect(new URL(`/uploads/${id}`, request.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve hotels" },
      { status: 400 },
    );
  }
}

