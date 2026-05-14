import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { importUploadBatch } from "@/lib/services/uploads";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const result = await importUploadBatch({ uploadBatchId: id, mode: "APPEND_NEW" }, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to import upload batch" }, { status: 400 });
  }
}
