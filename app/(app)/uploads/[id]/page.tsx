import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadImportForm } from "@/components/uploads/upload-import-form";
import { UploadMappingForm } from "@/components/uploads/upload-mapping-form";
import { UploadPreviewTable } from "@/components/uploads/upload-preview-table";
import { buildDefaultMapping } from "@/lib/uploads/mapping";
import { getUploadBatch } from "@/lib/services/uploads";

export default async function UploadBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getUploadBatch(id);
  if (!batch) {
    notFound();
  }

  const workbookMeta = batch.workbookMetaJson as { sheetNames?: string[] } | null;
  const validation = batch.validationJson as { summary?: Record<string, unknown>; rows?: Array<Record<string, unknown>> } | null;
  const preview = (batch.previewJson as Record<string, string>[] | null) ?? [];
  const headers = preview.length ? Object.keys(preview[0]) : [];
  const mapping = (batch.mappingJson as Record<string, string | null> | null) ?? buildDefaultMapping(headers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{batch.fileName}</h1>
        <p className="text-sm text-muted-foreground">Status: {batch.status} • Source: {batch.sourceName}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Batch details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Subject hotel:</strong> {batch.subjectHotel.name}</p>
            <p><strong>CompSet:</strong> {batch.compSet.name}</p>
            <p><strong>Import mode:</strong> {batch.importMode}</p>
            <p><strong>Selected sheet:</strong> {batch.selectedSheet ?? "Not selected"}</p>
            <p><strong>File type:</strong> {batch.fileType}</p>
            <p><strong>File size:</strong> {batch.fileSizeBytes} bytes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Select workbook sheet</CardTitle></CardHeader>
          <CardContent>
            <form action={`/api/uploads/${batch.id}/select-sheet`} method="post" className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <label htmlFor="selectedSheet" className="text-sm font-medium">Sheet</label>
                <Select id="selectedSheet" name="selectedSheet" defaultValue={batch.selectedSheet ?? workbookMeta?.sheetNames?.[0] ?? ""}>
                  {(workbookMeta?.sheetNames ?? []).map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Load sheet</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {preview.length ? (
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent><UploadPreviewTable rows={preview} /></CardContent>
        </Card>
      ) : null}

      {headers.length ? (
        <Card>
          <CardHeader><CardTitle>Column mapping</CardTitle></CardHeader>
          <CardContent>
            <UploadMappingForm uploadBatchId={batch.id} sourceName={batch.sourceName} headers={headers} defaultMapping={mapping} />
          </CardContent>
        </Card>
      ) : null}

      {validation ? (
        <Card>
          <CardHeader><CardTitle>Validation summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(validation.summary, null, 2)}</pre>
            </Alert>
            {Array.isArray(validation.rows) ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Stay Date</TableHead>
                      <TableHead>Capture Date</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Matched Hotel</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validation.rows.slice(0, 25).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{String(row.rowNumber ?? "")}</TableCell>
                        <TableCell>{String(row.hotelName ?? "")}</TableCell>
                        <TableCell>{String(row.stayDate ?? "")}</TableCell>
                        <TableCell>{String(row.captureDate ?? "")}</TableCell>
                        <TableCell>{String(row.nightlyRate ?? "")}</TableCell>
                        <TableCell>{String(row.matchedHotelName ?? "")}</TableCell>
                        <TableCell>{Array.isArray(row.errors) ? row.errors.join("; ") : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
            <UploadImportForm uploadBatchId={batch.id} importMode={batch.importMode} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
