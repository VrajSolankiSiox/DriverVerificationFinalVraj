import { notFound } from "next/navigation";

import { HotelForm } from "@/components/forms/hotel-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHotel } from "@/lib/services/hotels";

export default async function EditHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit hotel</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>{hotel.name}</CardTitle></CardHeader>
        <CardContent>
          <HotelForm hotelId={hotel.id} defaultValues={{
            name: hotel.name,
            brand: hotel.brand ?? undefined,
            addressLine1: hotel.addressLine1,
            addressLine2: hotel.addressLine2 ?? undefined,
            city: hotel.city,
            state: hotel.state ?? undefined,
            country: hotel.country,
            websiteUrl: hotel.websiteUrl ?? undefined,
            bookingUrl: hotel.bookingUrl ?? undefined,
            phone: hotel.phone ?? undefined,
            email: hotel.email ?? undefined,
            roomCount: hotel.roomCount ?? undefined,
            starLevel: hotel.starLevel ? Number(hotel.starLevel) : undefined,
            ownershipNotes: hotel.ownershipNotes ?? undefined,
            managementNotes: hotel.managementNotes ?? undefined,
          }} />
        </CardContent>
      </Card>
    </div>
  );
}
