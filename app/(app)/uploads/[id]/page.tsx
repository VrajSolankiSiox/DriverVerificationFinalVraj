import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadPreviewTable } from "@/components/uploads/upload-preview-table";
import { readBufferFromPath } from "@/lib/fs-storage";
import { getUploadBatch } from "@/lib/services/uploads";
import { getSheetByName, parseWorkbookBuffer, previewSheetRows } from "@/lib/uploads/parse-workbook";
import { selectSheetAction, importObservationsAction, resolveHotelsAction } from "../actions";

export default async function UploadBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getUploadBatch(id);
  if (!batch) {
    notFound();
  }

  const workbookMeta = batch.workbookMetaJson as { sheetNames?: string[] } | null;
  const validation = batch.validationJson as { summary?: Record<string, unknown>; rows?: Array<Record<string, unknown>> } | null;
  const summary = batch.summaryJson as {
    inserted?: number;
    updated?: number;
    skipped?: number;
    totalRows?: number;
    validRows?: number;
    skipReasons?: Record<string, number>;
  } | null;

  // ... (rest of metadata extraction)

  const skipReasonLabels: Record<string, string> = {
    hasErrors: "Row has validation errors",
    noMatchedHotel: "Hotel not found in compset",
    noStayDate: "Missing stay date",
    noCaptureDate: "Missing capture date",
    noNightlyRate: "Rate is not a number",
    noCurrency: "Missing currency",
    existing: "Observation already exists (skip existing mode)",
  };
  let preview = (batch.previewJson as Record<string, string>[] | null) ?? [];
  if (batch.selectedSheet && batch.storagePath) {
    try {
      const buffer = await readBufferFromPath(batch.storagePath);
      const sheets = parseWorkbookBuffer(buffer, batch.fileName);
      const selected = getSheetByName(sheets, batch.selectedSheet);
      preview = previewSheetRows(selected);
    } catch (error) {
      console.error("Failed to recompute upload preview from workbook:", error);
    }
  }
  const unresolvedHotels =
    (validation?.summary as { unresolvedHotels?: string[] } | null)?.unresolvedHotels ?? [];
  const validationSummary = (validation?.summary as {
    subjectHotelObservedInFile?: boolean;
    missingCompSetHotelsInFile?: string[];
    validationMessages?: string[];
  } | null) ?? null;
  const subjectHotelMissingInFile = validationSummary?.subjectHotelObservedInFile === false;
  const missingCompSetHotelsInFile = validationSummary?.missingCompSetHotelsInFile ?? [];
  const validationMessages = validationSummary?.validationMessages ?? [];
  const importBlockedByValidation = subjectHotelMissingInFile;
  
  const today = new Date();

  return (
    <div className="space-y-6">
      {batch.status === "IMPORTED" || batch.status === "PARTIAL_FAILED" ? (
        <div>
          <Button asChild>
            <Link href={`/reports/new?uploadBatchId=${batch.id}`}>Create report from this upload</Link>
          </Button>
        </div>
      ) : null}

      {summary ? (
        <Card>
          <CardHeader><CardTitle>Import results</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Inserted:</strong> {summary.inserted ?? 0}</p>
            <p><strong>Updated:</strong> {summary.updated ?? 0}</p>
            <p><strong>Skipped:</strong> {summary.skipped ?? 0}</p>
            <p><strong>Total rows:</strong> {summary.totalRows ?? "-"}</p>
            <p><strong>Valid rows:</strong> {summary.validRows ?? "-"}</p>

            {summary.skipReasons && Object.entries(summary.skipReasons).some(([_, count]) => count > 0) && (
              <div className="mt-4 border-t pt-2 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skip breakdown</p>
                {Object.entries(summary.skipReasons).map(([key, count]) => count > 0 ? (
                  <p key={key} className="text-xs flex justify-between">
                    <span>{skipReasonLabels[key] || key}:</span>
                    <span className="font-mono">{count}</span>
                  </p>
                ) : null)}
              </div>
            )}

            {(summary.inserted ?? 0) === 0 && (summary.updated ?? 0) === 0 ? (
              <p className="text-muted-foreground">
                No observations were imported. This usually means the file hotels did not match the selected compset or required fields were unmapped.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
            <form action={selectSheetAction.bind(null, batch.id)} className="flex items-end gap-3">
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
        <div className="space-y-4">
          <Card className="rounded-2xl border-muted/50 shadow-md">
            <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
              <div className="flex">
                <CardTitle>Data Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <UploadPreviewTable rows={preview} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Import observations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Hotel names should appear in the first column. This action imports each hotel/date cell as an observation.
              </p>
              <form action={importObservationsAction.bind(null, batch.id)} className="grid gap-3 md:grid-cols-3 md:items-end">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-sm font-medium" htmlFor="year">Year for date headers</label>
                  <input
                    id="year"
                    name="year"
                    defaultValue={today.getFullYear()}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-1">
                  <Button type="submit" variant="secondary" disabled={importBlockedByValidation}>
                    Import observations
                  </Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground">
                Capture date is set automatically to today. Currency defaults to USD. Hotels are auto-matched into the compset.
              </p>
              {importBlockedByValidation ? (
                <p className="text-xs text-destructive">
                  Import is blocked because the subject hotel is missing from the Excel file.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {validation ? (
        <Card>
          <CardHeader><CardTitle>Validation summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {subjectHotelMissingInFile ? (
              <Alert className="border-destructive/50 bg-destructive/5">
                <div className="text-sm font-medium text-destructive">
                  Subject hotel does not exist in this Excel file.
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Subject hotel: <strong>{batch.subjectHotel.name}</strong>. Import is blocked until the subject row is present in Excel.
                </div>
              </Alert>
            ) : null}
            {missingCompSetHotelsInFile.length > 0 ? (
              <Alert>
                <div className="text-sm font-medium">CompSet hotels missing in Excel</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Matching is case-insensitive and ignores punctuation/spaces.
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {missingCompSetHotelsInFile.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {validationMessages.length > 0 ? (
              <Alert>
                <div className="text-sm font-medium">Validation messages</div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {validationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <Alert>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(validation.summary, null, 2)}</pre>
            </Alert>
            {unresolvedHotels.length ? (
              <Alert>
                <div className="text-sm font-medium">Unresolved hotels</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  These hotel names are not found in the selected compset, so rows will not import.
                  Add them to the compset or upload using a compset that includes them.
                </div>
                <form action={resolveHotelsAction.bind(null, batch.id)} className="mt-3">
                  <Button type="submit" variant="secondary">Add unresolved hotels to compset</Button>
                </form>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {unresolvedHotels.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {Array.isArray(validation.rows) ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Showing first 25 rows of {validation.rows.length} validated rows.
                </p>
                <div className="overflow-x-auto rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white">
                        <TableHead className="pl-6">Row</TableHead>
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
                        <TableRow key={index} className="transition-colors hover:bg-muted/40">
                          <TableCell className="pl-6 font-medium">{String(row.rowNumber ?? "")}</TableCell>
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
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
