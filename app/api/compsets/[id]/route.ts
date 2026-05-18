import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { updateCompSet } from "@/lib/services/compsets";
import { refreshReportsForCompSet } from "@/lib/services/reports";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = await request.json();
    const compset = await updateCompSet(id, payload, user.id);
    await refreshReportsForCompSet(compset.id, user.id);
    return NextResponse.json({ id: compset.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update compset" },
      { status: 400 },
    );
  }
}
