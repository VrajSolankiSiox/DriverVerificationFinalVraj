import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getExportArtifact } from "@/lib/services/exports";

const exportRoot = path.join(process.cwd(), "storage", "exports");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireApiUser();
  const { id } = await params;
  const artifact = await getExportArtifact(id);
  if (!artifact?.storagePath || artifact.status !== "SUCCESS") {
    return NextResponse.json({ error: "Export not available" }, { status: 404 });
  }

  const resolvedPath = path.resolve(artifact.storagePath);
  const relative = path.relative(exportRoot, resolvedPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Export not available" }, { status: 404 });
  }
  const data = await readFile(resolvedPath);
  const filename = artifact.fileName ?? path.basename(artifact.storagePath);
  const contentType = artifact.type === "PDF" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
