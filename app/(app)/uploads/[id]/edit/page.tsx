import { notFound } from "next/navigation";
import { getUploadBatch } from "@/lib/services/uploads";
import ReuploadForm from "@/components/uploads/reupload-form";

export default async function EditUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getUploadBatch(id);

  if (!batch) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ReuploadForm uploadId={id} fileName={batch.fileName} />
    </div>
  );
}
