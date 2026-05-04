import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUploadBatches } from "@/lib/services/uploads";
import { formatDate } from "@/lib/utils";

export default async function UploadsPage() {
  const uploads = await listUploadBatches();
  return (
    <div className="space-y-8  ">
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Uploads</h1>
          <p className="text-sm text-muted-foreground">Expedia files, mappings, validation, and import batches.</p>
        </div>
      </div> */}
      <Card className="rounded-2xl border-muted/50 shadow-md overflow-hidden">
        <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
          <div className="flex">
            <CardTitle>Upload batches</CardTitle>
          </div>
          <div>
            <Button asChild size="lg" className="gap-2 rounded-xl shadow-sm">
              <Link href="/uploads/new">
                <Plus className="h-4 w-4" />
                New upload
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {uploads.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">File</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => {
                  const summary = upload.summaryJson as { inserted?: number } | null;
                  return (
                    <TableRow key={upload.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="pl-6 text-md font-medium"><Link href={`/uploads/${upload.id}`} className="text-foreground hover:text-primary transition-colors">{upload.fileName}</Link></TableCell>
                      <TableCell>{upload.subjectHotel.name}</TableCell>
                      <TableCell>{upload.status}</TableCell>
                      <TableCell>{summary?.inserted ?? "—"}</TableCell>
                      <TableCell>{formatDate(upload.createdAt)}</TableCell>
                      <TableCell>
                        <Link href={`/uploads/${upload.id}`} className="inline-flex items-center text-muted-foreground hover:text-primary">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10">
              <EmptyState title="No uploads" description="Start by uploading an Expedia file." actionHref="/uploads/new" actionLabel="New upload" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
