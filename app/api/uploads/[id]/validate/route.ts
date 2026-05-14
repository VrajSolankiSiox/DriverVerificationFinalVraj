import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { validateUploadBatch } from "@/lib/services/uploads";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = await request.json();
    const result = await validateUploadBatch(
      { ...payload, uploadBatchId: id, autoAddUnresolvedHotels: false },
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to validate upload" }, { status: 400 });
  }
}
