import { CompSetForm } from "@/components/forms/compset-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function NewCompSetPage() {
  const hotels = await prisma.hotel.findMany({
    where: { profileSource: "MANUAL" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CompSet setup</CardTitle>
        </CardHeader>
        <CardContent>
          <CompSetForm subjectHotels={hotels} competitorHotels={hotels} />
        </CardContent>
      </Card>
    </div>
  );
}
