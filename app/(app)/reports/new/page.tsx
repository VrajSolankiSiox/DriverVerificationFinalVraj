import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCreateForm } from "@/components/forms/report-create-form";
import { prisma } from "@/lib/prisma";

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ uploadBatchId?: string }>;
}) {
  const { uploadBatchId } = await searchParams;

  const [hotels, compsets, uploads] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.compSet.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        subjectHotelId: true,
        members: {
          select: {
            hotelId: true,
            roleType: true,
            hotel: {
              select: {
                name: true,
                websiteSnapshots: {
                  where: { status: "COMPLETE" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { seoScoreTotal: true },
                },
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
    prisma.uploadBatch.findMany({
      where: { status: { in: ["IMPORTED", "PARTIAL_FAILED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        subjectHotelId: true,
        compSetId: true,
        status: true,
        createdAt: true,
        summaryJson: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Report setup</CardTitle></CardHeader>
        <CardContent>
          <ReportCreateForm
            hotels={hotels}
            compsets={compsets.map((compset) => ({
              ...compset,
              members: compset.members.map((member) => ({
                hotelId: member.hotelId,
                roleType: member.roleType,
                hotel: { name: member.hotel.name },
                hasSeo: member.hotel.websiteSnapshots?.[0]?.seoScoreTotal !== null && member.hotel.websiteSnapshots?.[0]?.seoScoreTotal !== undefined,
              })),
            }))}
            uploads={uploads}
            defaultUploadBatchId={uploadBatchId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
