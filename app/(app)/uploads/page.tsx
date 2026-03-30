import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUploadBatches } from "@/lib/services/uploads";
import { formatDate } from "@/lib/utils";

export default async function UploadsPage() {
  const uploads = await listUploadBatches();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Uploads</h1>
          <p className="text-sm text-muted-foreground">Expedia files, mappings, validation, and import batches.</p>
        </div>
        <Button asChild><Link href="/uploads/new">New upload</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Upload batches</CardTitle></CardHeader>
        <CardContent>
          {uploads.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Hotel</TableHead><TableHead>Status</TableHead><TableHead>Imported</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {uploads.map((upload) => {
                  const summary = upload.summaryJson as { inserted?: number } | null;
                  return (
                    <TableRow key={upload.id}>
                      <TableCell><Link href={`/uploads/${upload.id}`}>{upload.fileName}</Link></TableCell>
                      <TableCell>{upload.subjectHotel.name}</TableCell>
                      <TableCell>{upload.status}</TableCell>
                      <TableCell>{summary?.inserted ?? "—"}</TableCell>
                      <TableCell>{formatDate(upload.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No uploads" description="Start by uploading an Expedia file." actionHref="/uploads/new" actionLabel="New upload" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
