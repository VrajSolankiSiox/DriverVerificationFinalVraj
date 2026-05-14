import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createUploadBatch, listUploadBatches } from "@/lib/services/uploads";
import { uploadStartSchema } from "@/lib/validations/upload";

export async function GET() {
  await requireApiUser();
  const batches = await listUploadBatches();
  return NextResponse.json(batches);
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("File is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = uploadStartSchema.parse({
      sourceName: formData.get("sourceName") ?? "Expedia",
      subjectHotelId: formData.get("subjectHotelId") ?? "",
      compSetId: formData.get("compSetId") ?? "",
      importMode: "APPEND_NEW",
      scheduledDemoDate: formData.get("scheduledDemoDate") ?? null,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    });
    const batch = await createUploadBatch(
      {
        ...parsed,
        fileBuffer: buffer,
      },
      user.id,
    );

    return NextResponse.json({ id: batch.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create upload batch" }, { status: 400 });
  }
}
