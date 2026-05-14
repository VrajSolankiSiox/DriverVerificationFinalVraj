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

  const manualResponseRows = hotel.reviewSnapshots.filter(
    (snapshot) => snapshot.sentimentSummary === "MANUAL_RESPONSE_SCREENSHOT",
  );

  const reviewResponseScreenshots = Object.fromEntries(
    manualResponseRows
      .map((snapshot) => {
        const raw =
          (snapshot.rawJson as { platform?: string; imageDataUrl?: string } | null) ??
          null;
        const platform = raw?.platform;
        const imageDataUrl = raw?.imageDataUrl;
        if (!platform || !imageDataUrl) {
          return ["", ""];
        }
        return [platform, imageDataUrl];
      })
      .filter(([platform, imageDataUrl]) => Boolean(platform) && Boolean(imageDataUrl)),
  );

  const reviewResponsePresenceFromData = Object.fromEntries(
    manualResponseRows
      .map((snapshot) => {
        const raw =
          (snapshot.rawJson as {
            platform?: string;
            presence?: "RESPONDED" | "NOT_RESPONDED" | "NO_PRESENCE" | "NO_REVIEW";
          } | null) ?? null;
        if (!raw?.platform) return ["", ""] as const;
        return [raw.platform, raw.presence ?? "NO_PRESENCE"] as const;
      })
      .filter(([platform]) => Boolean(platform)),
  );

  const reviewResponsePresence = Object.fromEntries(
    ["google", "expedia", "booking", "tripadvisor"].map((platform) => [
      platform,
      reviewResponsePresenceFromData[platform] ??
        (reviewResponseScreenshots[platform] ? "RESPONDED" : "NO_PRESENCE"),
    ]),
  );
  const otaRatingsRaw = (hotel.otaRatings as Record<string, unknown> | null) ?? null;
  const organicFromHotel = ((otaRatingsRaw?.__organicSearchPositions as Record<string, unknown> | undefined) ?? {});
  const toOrganicInput = (value: unknown): number | "" | "X" | "x" => {
    if (value === null || value === undefined || value === "") return "";
    const text = String(value).trim();
    if (text === "X" || text === "x") return text as "X" | "x";
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : "";
  };
  const otaRatingsOnly =
    otaRatingsRaw
      ? Object.fromEntries(Object.entries(otaRatingsRaw).filter(([key]) => key !== "__organicSearchPositions"))
      : undefined;

  return (
    <div className="space-y-6">
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
            ownerName: hotel.ownerName ?? undefined,
            phone: hotel.phone ?? undefined,
            email: hotel.email ?? undefined,
            roomCount: hotel.roomCount ?? undefined,
            starLevel: hotel.starLevel ? Number(hotel.starLevel) : undefined,
            ownershipNotes: hotel.ownershipNotes ?? undefined,
            managementNotes: hotel.managementNotes ?? undefined,
            reviewResponded: hotel.reviewReplied ?? false,
            reviewResponseScreenshots,
            reviewResponsePresence,
            otaRatings: (otaRatingsOnly as Record<string, string> | undefined) ?? undefined,
            organicSearchPositions: {
              google: toOrganicInput(organicFromHotel.google),
              expedia: toOrganicInput(organicFromHotel.expedia),
              bookingCom: toOrganicInput(organicFromHotel.bookingCom),
              priceline: toOrganicInput(organicFromHotel.priceline),
            },
          }} />
        </CardContent>
      </Card>
    </div>
  );
}
