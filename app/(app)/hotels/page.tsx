import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listHotels } from "@/lib/services/hotels";

export default async function HotelsPage() {
  const hotels = await listHotels();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hotels</h1>
          <p className="text-sm text-muted-foreground">Subject and comp property profiles.</p>
        </div>
        <Button asChild><Link href="/hotels/new">Create hotel</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Hotel list</CardTitle></CardHeader>
        <CardContent>
          {hotels.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Website</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {hotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>{hotel.name}</TableCell>
                    <TableCell>{hotel.city}, {hotel.country}</TableCell>
                    <TableCell>{hotel.websiteUrl ? <a href={hotel.websiteUrl} target="_blank">Open</a> : "—"}</TableCell>
                    <TableCell><Link href={`/hotels/${hotel.id}`}>View</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No hotels" description="Create your first hotel profile." actionHref="/hotels/new" actionLabel="Create hotel" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
