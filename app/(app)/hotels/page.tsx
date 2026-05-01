import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listHotels } from "@/lib/services/hotels";

export default async function HotelsPage() {
    const hotels = await listHotels();
    return (
        <div className="space-y-8">
            <Card className="rounded-2xl border-muted/50 shadow-md overflow-hidden">
                <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
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
                <CardContent className="p-0">
                    {hotels.length ? (
                        <Table>
                                <TableHeader>
                                    <TableRow className="bg-white">
                                        <TableHead className="pl-6">Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Website</TableHead>
                                        <TableHead className="w-[80px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hotels.map((hotel) => (
                                        <TableRow key={hotel.id} className="transition-colors hover:bg-muted/40">
                                            <TableCell className="pl-6 text-md font-medium">{hotel.name}</TableCell>
                                            <TableCell>{hotel.city}, {hotel.country}</TableCell>
                                            <TableCell>{hotel.websiteUrl ? <a href={hotel.websiteUrl} target="_blank" className="text-foreground hover:text-primary transition-colors">Open</a> : "—"}</TableCell>
                                            <TableCell>
                                                <Link href={`/hotels/${hotel.id}`} className="inline-flex items-center text-muted-foreground hover:text-primary">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                        </Table>
                    ) : (
                        <div className="p-10">
                            <EmptyState title="No hotels" description="Create your first hotel profile." actionHref="/hotels/new" actionLabel="Create hotel" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
