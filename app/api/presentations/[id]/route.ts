import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { updatePresentation } from "@/lib/services/presentations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = (await request.json()) as {
      name?: string;
      reportTitleOverride?: string | null;
      slideTitlesJson?: Record<string, string>;
    };

    await updatePresentation(id, user.id, {
      name: payload.name,
      reportTitleOverride: payload.reportTitleOverride,
      slideTitlesJson: payload.slideTitlesJson,
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update presentation" }, { status: 400 });
  }
}
