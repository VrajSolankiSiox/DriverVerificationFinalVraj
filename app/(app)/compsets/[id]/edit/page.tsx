import { notFound } from "next/navigation";

import { CompSetForm } from "@/components/forms/compset-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCompSet, parseCompMemberMetadata } from "@/lib/services/compsets";

export default async function EditCompSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [compSet, hotels] = await Promise.all([
    getCompSet(id),
    prisma.hotel.findMany({
      where: { profileSource: "MANUAL" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!compSet) {
    notFound();
  }

  const compHotels = compSet.members
    .filter((member) => member.roleType === "COMP")
    .map((member) => {
      const parsedMetadata = parseCompMemberMetadata(member.notes);
      return {
      hotelName: member.hotel.name,
      starRating: parsedMetadata.starRating ?? Number(member.hotel.starLevel ?? 0),
      roomCount: parsedMetadata.roomCount ?? member.hotel.roomCount ?? 1,
      ratings: {
        google: parsedMetadata.ratings.google?.value ?? "",
        expedia: parsedMetadata.ratings.expedia?.value ?? "",
        booking: parsedMetadata.ratings.booking?.value ?? "",
        agoda: parsedMetadata.ratings.agoda?.value ?? "",
        priceline: parsedMetadata.ratings.priceline?.value ?? "",
      },
      organicSearchPositions: {
        expedia: String(parsedMetadata.organicSearchPositions.expedia ?? 1),
        bookingCom: String(parsedMetadata.organicSearchPositions.bookingCom ?? 1),
        priceline: String(parsedMetadata.organicSearchPositions.priceline ?? 1),
        google: String(parsedMetadata.organicSearchPositions.google ?? 1),
      },
    };
    });

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
