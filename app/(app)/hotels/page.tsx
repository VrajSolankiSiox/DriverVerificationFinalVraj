import Link from "next/link";
import { Plus, EllipsisVertical, Eye, PencilLine } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listHotels } from "@/lib/services/hotels";

export default async function HotelsPage() {
  const hotels = await listHotels();

  return (
    <div className="space-y-8">
      <Card className="overflow-visible rounded-2xl border-muted/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
          <div className="flex">
            <CardTitle>Hotel list</CardTitle>
          </div>
          <div>
            <Button asChild size="lg" className="gap-2 rounded-xl shadow-sm">
              <Link href="/hotels/new">
                <Plus className="h-4 w-4" />
                Create hotel
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-visible p-0">
          {hotels.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotels.map((hotel) => (
                  <TableRow
                    key={hotel.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="pl-6 text-md font-medium">
                      <Link
                        href={`/hotels/${hotel.id}`}
                        className="text-slate-900 hover:text-primary hover:underline"
                      >
                        {hotel.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {hotel.city}, {hotel.country}
                    </TableCell>
                    <TableCell>
                      {hotel.websiteUrl ? (
                        <a
                          href={hotel.websiteUrl}
                          target="_blank"
                          className="text-foreground transition-colors hover:text-primary"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <details name="hotel-actions-menu" className="relative inline-block">
                        <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <EllipsisVertical className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                          <Link
                            href={`/hotels/${hotel.id}`}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                          <Link
                            href={`/hotels/${hotel.id}/edit`}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </Link>
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10">
              <EmptyState
                title="No hotels"
                description="Create your first hotel profile."
                actionHref="/hotels/new"
                actionLabel="Create hotel"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
