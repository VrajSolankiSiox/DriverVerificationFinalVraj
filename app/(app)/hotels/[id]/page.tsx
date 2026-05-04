import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { HotelActions } from "@/components/hotels/hotel-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getHotel } from "@/lib/services/hotels";
import { formatDate } from "@/lib/utils";

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{hotel.name}</h1>
          <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.state ?? hotel.country}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href={`/hotels/${hotel.id}/edit`}>Edit</Link></Button>
          <HotelActions hotelId={hotel.id} />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Hotel snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Brand:</strong> {hotel.brand ?? "—"}</p>
            <p><strong>Address:</strong> {hotel.addressLine1}</p>
            <p><strong>Website:</strong> {hotel.websiteUrl ? <a href={hotel.websiteUrl} target="_blank">{hotel.websiteUrl}</a> : "—"}</p>
            <p><strong>Booking URL:</strong> {hotel.bookingUrl ? <a href={hotel.bookingUrl} target="_blank">{hotel.bookingUrl}</a> : "—"}</p>
            <p><strong>Phone:</strong> {hotel.phone ?? "—"}</p>
            <p><strong>Email:</strong> {hotel.email ?? "—"}</p>
            <p><strong>Room count:</strong> {hotel.roomCount ?? "—"}</p>
            <p><strong>Star level:</strong> {hotel.starLevel ? Number(hotel.starLevel).toFixed(1) : "—"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-muted/50 shadow-md">
          <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
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
                      <TableCell>{snapshot.scoreTotal ?? "—"}</TableCell>
                      <TableCell>{snapshot.seoScoreTotal ?? "—"}</TableCell>
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
          <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
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
                      <TableCell>{snapshot.averageRating ? Number(snapshot.averageRating).toFixed(1) : "—"}</TableCell>
                      <TableCell>{snapshot.reviewCount ?? "—"}</TableCell>
                      <TableCell>{formatDate(snapshot.capturedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">No review snapshots yet. Run a review snapshot to capture TripAdvisor and Google ratings.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>CompSets using this hotel as subject</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {hotel.subjectCompSets.map((compSet) => (
              <li key={compSet.id}><Link href={`/compsets/${compSet.id}`}>{compSet.name}</Link></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
