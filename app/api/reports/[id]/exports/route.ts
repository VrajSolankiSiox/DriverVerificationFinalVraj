import { z } from "zod";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { generateExport } from "@/lib/services/exports";

const exportRequestSchema = z.object({
  type: z.enum(["PPTX", "PDF"]),
  visibility: z.enum(["CLIENT_SAFE", "INTERNAL_FULL"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = exportRequestSchema.parse(await request.json());
    const artifact = await generateExport(
      {
        reportId: id,
        type: payload.type,
        visibility: payload.visibility,
      },
      user.id,
    );
    return NextResponse.json({ id: artifact.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate export" }, { status: 400 });
  }
}
