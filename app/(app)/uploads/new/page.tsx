import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadStartForm } from "@/components/uploads/upload-start-form";
import { prisma } from "@/lib/prisma";

export default async function NewUploadPage() {
  const [hotels, compsets] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.compSet.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, subjectHotelId: true } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Upload wizard</CardTitle></CardHeader>
        <CardContent><UploadStartForm hotels={hotels} compsets={compsets} /></CardContent>
      </Card>
    </div>
  );
}
