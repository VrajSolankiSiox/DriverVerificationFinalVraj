import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCreateForm } from "@/components/forms/report-create-form";
import { prisma } from "@/lib/prisma";

export default async function NewReportPage() {
  const [hotels, compsets] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.compSet.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, subjectHotelId: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create report</h1>
        <p className="text-sm text-muted-foreground">Bind a subject hotel to a selected compset snapshot and generate modular sections.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Report setup</CardTitle></CardHeader>
        <CardContent><ReportCreateForm hotels={hotels} compsets={compsets} /></CardContent>
      </Card>
    </div>
  );
}
