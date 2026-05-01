import { notFound } from "next/navigation";

import { CompSetForm } from "@/components/forms/compset-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCompSet, parseCompMemberOtaRatings } from "@/lib/services/compsets";

export default async function EditCompSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [compSet, hotels] = await Promise.all([
    getCompSet(id),
    prisma.hotel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!compSet) {
    notFound();
  }

  const compHotels = compSet.members
    .filter((member) => member.roleType === "COMP")
    .map((member) => ({
      hotelName: member.hotel.name,
      websiteUrl: member.hotel.websiteUrl ?? "",
      bookingUrl: member.hotel.bookingUrl ?? "",
      expediaLink: member.hotel.expediaUrl ?? "",
      otaRatings: parseCompMemberOtaRatings(member.notes),
    }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{compSet.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CompSetForm
            subjectHotels={hotels}
            competitorHotels={hotels}
            compSetId={compSet.id}
            defaultValues={{
              name: compSet.name,
              subjectHotelId: compSet.subjectHotelId,
              compHotels,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
