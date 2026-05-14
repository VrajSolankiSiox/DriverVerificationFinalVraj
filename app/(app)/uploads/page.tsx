import Link from "next/link";
import { Plus, EllipsisVertical, Eye } from "lucide-react";

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
      <Card className="overflow-visible rounded-2xl border-muted/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
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
        <CardContent className="overflow-visible p-0">
          {uploads.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">File</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => {
                  const summary = upload.summaryJson as { inserted?: number } | null;
                  return (
                    <TableRow key={upload.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="pl-6 text-md font-medium"><Link href={`/uploads/${upload.id}`} className="text-foreground transition-colors hover:text-primary">{upload.fileName}</Link></TableCell>
                      <TableCell>{upload.subjectHotel.name}</TableCell>
                      <TableCell>{upload.status}</TableCell>
                      <TableCell>{summary?.inserted ?? "-"}</TableCell>
                      <TableCell>{formatDate(upload.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <details name="upload-actions-menu" className="relative inline-block">
                          <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                            <EllipsisVertical className="h-4 w-4" />
                          </summary>
                          <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                            <Link
                              href={`/uploads/${upload.id}`}
                              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                            <Link
                              href={`/uploads/${upload.id}/edit`}
                              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                            >
                              <Plus className="h-4 w-4 rotate-45 transform" />
                              Edit
                            </Link>
                          </div>
                        </details>
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
