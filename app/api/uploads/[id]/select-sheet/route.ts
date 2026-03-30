import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { selectUploadSheet } from "@/lib/services/uploads";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  const { id } = await params;
  const formData = await request.formData();
  const selectedSheet = String(formData.get("selectedSheet") ?? "");
  await selectUploadSheet({ uploadBatchId: id, selectedSheet }, user.id);
  return NextResponse.redirect(new URL(`/uploads/${id}`, request.url));
}
