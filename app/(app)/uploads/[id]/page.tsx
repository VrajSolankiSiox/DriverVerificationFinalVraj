import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { UploadPreviewTable } from "@/components/uploads/upload-preview-table";
import { readBufferFromPath } from "@/lib/fs-storage";
import { getUploadBatch } from "@/lib/services/uploads";
import {
  getSheetByName,
  parseWorkbookBuffer,
  previewSheetRows,
} from "@/lib/uploads/parse-workbook";
import {
  selectSheetAction,
  importObservationsAction,
  pruneCompSetToMatchedHotelsAction,
} from "../actions";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-sky-100 bg-white">
      <CardHeader className="border-b border-sky-50 bg-transparent">
        <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </CardTitle>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}

export default async function UploadBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getUploadBatch(id);
  if (!batch) {
    notFound();
  }

  const workbookMeta = batch.workbookMetaJson as {
    sheetNames?: string[];
  } | null;
  const validation = batch.validationJson as {
    summary?: Record<string, unknown>;
    rows?: Array<{
      matchedHotelName?: string | null;
      matchedHotelId?: string | null;
      errors?: string[];
    }>;
  } | null;
  const summary = batch.summaryJson as {
    inserted?: number;
    updated?: number;
    skipped?: number;
    totalRows?: number;
    validRows?: number;
    skipReasons?: Record<string, number>;
  } | null;

  const skipReasonLabels: Record<string, string> = {
    hasErrors: "Row has validation errors",
    noMatchedHotel: "Hotel not found in compset",
    noStayDate: "Missing stay date",
    noCaptureDate: "Missing capture date",
    noNightlyRate: "Rate is not a number",
    noCurrency: "Missing currency",
    existing: "Observation already exists",
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
    (validation?.summary as { unresolvedHotels?: string[] } | null)
      ?.unresolvedHotels ?? [];
  const validationSummary =
    (validation?.summary as {
      subjectHotelObservedInFile?: boolean;
      missingCompSetHotelsInFile?: string[];
      validationMessages?: string[];
      totalRows?: number;
      validRows?: number;
      errorRows?: number;
      fileHotels?: number;
      matchedHotels?: number;
      duplicatesInFile?: number;
    }) ?? null;

  const subjectHotelMissingInFile =
    validationSummary?.subjectHotelObservedInFile === false;
  const missingCompSetHotelsInFile =
    validationSummary?.missingCompSetHotelsInFile ?? [];
  const validationMessages = validationSummary?.validationMessages ?? [];
  const importBlockedByValidation = subjectHotelMissingInFile;

  const comps = batch.compSet.members.filter((m) => m.roleType === "COMP");
  const matchedHotelNamesFromFile = [
    ...new Set(
      (validation?.rows ?? [])
        .filter((row) => (row.errors?.length ?? 0) === 0 && row.matchedHotelId)
        .map((row) => (row.matchedHotelName ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const matchedHotelNameSet = new Set(
    matchedHotelNamesFromFile.map((name) => name.toLowerCase()),
  );
  const displayMembers =
    matchedHotelNamesFromFile.length > 0
      ? batch.compSet.members.filter((member) =>
          matchedHotelNameSet.has(member.hotel.name.trim().toLowerCase()),
        )
      : batch.compSet.members;
  const displayCompCount =
    matchedHotelNamesFromFile.length > 0
      ? displayMembers.filter((m) => m.roleType === "COMP").length
      : comps.length;
  const hasExtraCompMembers =
    matchedHotelNamesFromFile.length > 0 &&
    batch.compSet.members.filter((m) => m.roleType === "COMP").length > displayCompCount;
  const today = new Date();

  return (
    <div className="relative space-y-6 overflow-hidden -mt-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44" />

      <section className="relative overflow-hidden rounded-md border border-sky-100 bg-white px-5 py-6 text-slate-900 shadow-md md:px-8 md:py-8">
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-sky-100 bg-sky-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-800">
                {batch.status}
              </Badge>
              <Badge className="border-blue-100 bg-blue-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-800">
                Upload Batch
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-sky-700">
                Upload Workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {batch.subjectHotel.name}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Validate Excel content against{" "}
                <strong>{batch.compSet.name}</strong>, review data quality, and
                import clean observations into the report pipeline.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-sky-100 bg-sky-50/60 px-3 py-1.5">
                CompSet competitors: {displayCompCount}
              </span>
              <span className="rounded-full border border-sky-100 bg-sky-50/60 px-3 py-1.5">
                Data source: {batch.fileName}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {batch.status === "IMPORTED" ||
            batch.status === "PARTIAL_FAILED" ? (
              <Button
                asChild
                variant="secondary"
                className="border-sky-100 bg-sky-50 text-sky-900 hover:bg-sky-100 hover:text-sky-950"
              >
                <Link href={`/reports/new?uploadBatchId=${batch.id}`}>
                  Create report from this upload
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="border-muted/20 bg-white shadow-sm hover:bg-muted/10"
            >
              <Link href={`/uploads/${batch.id}/edit`}>
                Edit / Replace File
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <SectionCard
        title="Upload Context"
        description="Subject property, compset scope, and file metadata that define the validation and import context."
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Subject Hotel
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {batch.subjectHotel.name}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                CompSet
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {batch.compSet.name}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {displayCompCount} competitors
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Import Behavior
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                Append new observations only
              </p>
            </div>
          </div>

          <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {matchedHotelNamesFromFile.length > 0
                ? "CompSet Hotels Matched In This File"
                : "CompSet Hotels"}
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {displayMembers.map((member) => (
                <div
                  key={member.id}
                  className={`rounded-md border border-slate-200 px-3 py-2 text-sm ${
                    member.roleType === "SUBJECT" ? "bg-blue-500" : ""
                  }`}
                >
                  <span
                    className={` font-medium text-slate-900   ${
                      member.roleType === "SUBJECT"
                        ? "bg-blue-500 text-zinc-100 "
                        : ""
                    }`}
                  >
                    {member.hotel.name}
                  </span>
                  <span
                    className={`ml-2 text-xs ${
                      member.roleType === "SUBJECT"
                        ? "bg-white rounded-md  px-2  py-1 text-black"
                        : "text-slate-100 px-2 py-1 rounded-md bg-blue-500 "
                    }`}
                  >
                    {member.roleType}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Selected Sheet
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {batch.selectedSheet ?? "Not selected"}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                File Name
              </p>
              <p className="mt-2 break-all text-sm font-medium text-slate-900">
                {batch.fileName}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                File Type
              </p>
              <p className="mt-2 break-all text-sm font-medium text-slate-900">
                {batch.fileType}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                File Size
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatBytes(batch.fileSizeBytes)}
              </p>
            </div>
          </div>

          <form
            action={selectSheetAction.bind(null, batch.id)}
            className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
          >
            <div className="space-y-2">
              <label htmlFor="selectedSheet" className="text-sm font-medium">
                Workbook Sheet
              </label>
              <Select
                id="selectedSheet"
                name="selectedSheet"
                defaultValue={
                  batch.selectedSheet ?? workbookMeta?.sheetNames?.[0] ?? ""
                }
              >
                {(workbookMeta?.sheetNames ?? []).map((sheetName) => (
                  <option key={sheetName} value={sheetName}>
                    {sheetName}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Load sheet</Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Excel Sheet Preview"
        description="Raw worksheet view from the selected tab so you can verify the uploaded structure before importing."
      >
        <div className="overflow-hidden rounded-md border border-slate-100">
          {preview.length ? (
            <UploadPreviewTable rows={preview} />
          ) : (
            <div className="p-5 text-sm text-slate-500">
              No preview available yet. Select a sheet to load Excel data.
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Validation and Import"
        description="Clear quality checks and import controls based on subject hotel match, compset completeness, and row-level validity."
      >
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Rows
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {validationSummary?.totalRows ?? "-"}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Valid
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {validationSummary?.validRows ?? "-"}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Errors
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {validationSummary?.errorRows ?? "-"}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Hotels In File
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {validationSummary?.fileHotels ?? "-"}
              </p>
            </div>
            <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Matched Hotels
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {validationSummary?.matchedHotels ?? "-"}
              </p>
            </div>
          </div>

          {subjectHotelMissingInFile ? (
            <Alert className="border-destructive/50 bg-destructive/5">
              <div className="text-sm font-medium text-destructive">
                Import blocked: subject hotel is missing in the Excel file.
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Expected subject hotel:{" "}
                <strong>{batch.subjectHotel.name}</strong>
              </div>
            </Alert>
          ) : null}

          {missingCompSetHotelsInFile.length > 0 ? (
            <Alert className="border-amber-300 bg-amber-50/70">
              <div className="text-sm font-medium text-amber-900">
                Warning: {missingCompSetHotelsInFile.length} compset hotel
                {missingCompSetHotelsInFile.length > 1 ? "s are" : " is"}{" "}
                missing in the Excel file.
              </div>
              <div className="mt-1 text-sm text-amber-800">
                Import can continue, but competitive comparison may be
                incomplete.
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
              <div className="text-sm font-medium">Validation notes</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {unresolvedHotels.length > 0 ? (
            <Alert>
              <div className="text-sm font-medium">Unresolved hotels</div>
              <div className="mt-1 text-sm text-muted-foreground">
                These names were found in Excel but do not exist in the selected
                compset. They are blocked and will not be auto-added.
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {unresolvedHotels.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <form
            action={importObservationsAction.bind(null, batch.id)}
            className="grid gap-3 md:grid-cols-[220px_auto] md:items-end"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="year">
                Year for date headers
              </label>
              <input
                id="year"
                name="year"
                defaultValue={today.getFullYear()}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={importBlockedByValidation}
            >
              Import observations
            </Button>
          </form>

          <p className="text-xs text-slate-500">
            Capture date is set automatically to today. Currency defaults to
            USD. Hotels are auto-matched into the selected compset.
          </p>

          {hasExtraCompMembers ? (
            <Alert className="border-amber-300 bg-amber-50/70">
              <div className="text-sm font-medium text-amber-900">
                This compset currently has extra competitor hotels not matched in this file.
              </div>
              <div className="mt-1 text-sm text-amber-800">
                Use this once to clean it: keep only subject + matched hotels from this upload.
              </div>
              <form action={pruneCompSetToMatchedHotelsAction.bind(null, batch.id)} className="mt-3">
                <Button type="submit" variant="secondary">
                  Prune CompSet to Matched Hotels
                </Button>
              </form>
            </Alert>
          ) : null}

          {summary ? (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Last import result</p>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Inserted
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.inserted ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Updated
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.updated ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Skipped
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.skipped ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Total Rows
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.totalRows ?? "-"}
                  </p>
                </div>
                <div className="rounded-md border border-sky-100 bg-white p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Valid Rows
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {summary.validRows ?? "-"}
                  </p>
                </div>
              </div>

              {summary.skipReasons &&
              Object.entries(summary.skipReasons).some(
                ([_, count]) => count > 0,
              ) ? (
                <Alert className="border-amber-300 bg-amber-50/70">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                      Skipped rows breakdown
                    </p>
                    {Object.entries(summary.skipReasons).map(([key, count]) =>
                      count > 0 ? (
                        <p key={key} className="text-xs flex justify-between">
                          <span>{skipReasonLabels[key] || key}</span>
                          <span className="font-mono">{count}</span>
                        </p>
                      ) : null,
                    )}
                  </div>
                </Alert>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
