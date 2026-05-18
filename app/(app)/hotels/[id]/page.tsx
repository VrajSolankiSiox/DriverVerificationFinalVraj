import Link from "next/link";
import { notFound } from "next/navigation";

import { HotelActions } from "@/components/hotels/hotel-actions";
import { HotelScreenshotGallery } from "@/components/hotels/hotel-screenshot-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getHotel } from "@/lib/services/hotels";
import { formatDate } from "@/lib/utils";

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-800">{displayValue(value)}</p>
    </div>
  );
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) {
    notFound();
  }

  const otaRatingsRaw = (hotel.otaRatings as Record<string, unknown> | null) ?? null;
  const organicSearchPositions =
    (otaRatingsRaw?.__organicSearchPositions as Record<string, unknown> | undefined) ?? {};
  const otaRatingsOnly = otaRatingsRaw
    ? Object.entries(otaRatingsRaw).filter(
        ([key]) =>
          key !== "__organicSearchPositions" &&
          key.toLowerCase() !== "tripadvisor",
      )
    : [];

  const reviewResponseScreenshots = hotel.reviewSnapshots
    .filter((snapshot) => snapshot.sentimentSummary === "MANUAL_RESPONSE_SCREENSHOT")
    .map((snapshot) => {
      const raw =
        (snapshot.rawJson as {
          imageDataUrl?: string;
          platform?: string;
          reviewStatus?: string;
        } | null) ?? null;
      return {
        id: snapshot.id,
        platform: raw?.platform ?? snapshot.source.toLowerCase(),
        reviewStatus: raw?.reviewStatus ?? "RESPONDED",
        imageDataUrl: raw?.imageDataUrl ?? "",
        capturedAt: snapshot.capturedAt,
      };
    })
    .filter((item) => item.imageDataUrl.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{hotel.name}</h1>
          <p className="text-sm text-muted-foreground">
            {hotel.city}, {hotel.state ?? hotel.country}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/hotels/${hotel.id}/edit`}>Edit</Link>
          </Button>
          <HotelActions hotelId={hotel.id} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="Property name" value={hotel.name} />
            <DetailItem label="Brand / flag" value={hotel.brand} />
            <DetailItem label="City" value={hotel.city} />
            <DetailItem label="State" value={hotel.state} />
            <DetailItem label="Country" value={hotel.country} />
            <DetailItem label="Hotel owner name" value={hotel.ownerName} />
            <DetailItem label="Room count" value={hotel.roomCount} />
            <DetailItem
              label="Star level"
              value={hotel.starLevel ? Number(hotel.starLevel).toFixed(1) : null}
            />
            <DetailItem label="Review responded" value={hotel.reviewReplied ? "Yes" : "No"} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Address & Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="Address line 1" value={hotel.addressLine1} />
            <DetailItem label="Address line 2" value={hotel.addressLine2} />
            <DetailItem label="Phone" value={hotel.phone} />
            <DetailItem label="Email" value={hotel.email} />
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Website URL
              </p>
              <p className="text-sm text-slate-800">
                {hotel.websiteUrl ? (
                  <a
                    className="text-blue-700 underline underline-offset-2"
                    href={hotel.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {hotel.websiteUrl}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Booking URL
              </p>
              <p className="text-sm text-slate-800">
                {hotel.bookingUrl ? (
                  <a
                    className="text-blue-700 underline underline-offset-2"
                    href={hotel.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {hotel.bookingUrl}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OTA Platform Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            {otaRatingsOnly.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {otaRatingsOnly.map(([platform, value]) => (
                  <div key={platform} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {platform}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {displayValue(value as string | number | null)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No OTA ratings added.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organic Search Positions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              label="Google"
              value={organicSearchPositions.google as string | number | null | undefined}
            />
            <DetailItem
              label="Expedia"
              value={organicSearchPositions.expedia as string | number | null | undefined}
            />
            <DetailItem
              label="Booking.com"
              value={organicSearchPositions.bookingCom as string | number | null | undefined}
            />
            <DetailItem
              label="Priceline"
              value={organicSearchPositions.priceline as string | number | null | undefined}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ownership & Management Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Ownership Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                {displayValue(hotel.ownershipNotes)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Management Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                {displayValue(hotel.managementNotes)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
            <div className="flex">
              <CardTitle>Recent website audits</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hotel.websiteSnapshots.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>SEO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotel.websiteSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="pl-6">{formatDate(snapshot.createdAt)}</TableCell>
                      <TableCell>{snapshot.status}</TableCell>
                      <TableCell>{snapshot.scoreTotal ?? "-"}</TableCell>
                      <TableCell>{snapshot.seoScoreTotal ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">No website audit has been run yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
            <div className="flex">
              <CardTitle>Review snapshots</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hotel.reviewSnapshots?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="pl-6">Source</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotel.reviewSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="pl-6 font-medium">{snapshot.source}</TableCell>
                      <TableCell>
                        {snapshot.averageRating ? Number(snapshot.averageRating).toFixed(1) : "-"}
                      </TableCell>
                      <TableCell>{snapshot.reviewCount ?? "-"}</TableCell>
                      <TableCell>{formatDate(snapshot.capturedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">
                  No review snapshots yet. Run a review snapshot to capture Google ratings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-muted/50 shadow-md xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
            <div className="flex">
              <CardTitle>Review Response Screenshots</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <HotelScreenshotGallery
              screenshots={reviewResponseScreenshots}
              hotelId={hotel.id}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CompSets using this hotel as subject</CardTitle>
        </CardHeader>
        <CardContent>
          {hotel.subjectCompSets.length ? (
            <ul className="space-y-2 text-sm">
              {hotel.subjectCompSets.map((compSet) => (
                <li key={compSet.id}>
                  <Link href={`/compsets/${compSet.id}`}>{compSet.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              This hotel is not currently used as a subject in any CompSet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
