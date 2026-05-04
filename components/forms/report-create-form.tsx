"use client";

import { type ClipboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ManualHotel = {
  hotelId: string;
  name: string;
  roleType: "SUBJECT" | "COMP";
};

type ManualRateRow = {
  id: string;
  date: string;
  rates: Record<string, string>;
};

function toIsoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function todayIsoDate() {
  return toIsoDate(new Date());
}

function addDaysToIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if ([year, month, day].some((part) => !Number.isFinite(part))) {
    return todayIsoDate();
  }
  return toIsoDate(new Date(year, month - 1, day + days));
}

function formatManualDateLabel(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function createManualRow(
  hotelIds: string[],
  date = todayIsoDate(),
): ManualRateRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    rates: Object.fromEntries(hotelIds.map((hotelId) => [hotelId, ""])),
  };
}

function getNextManualDate(rows: ManualRateRow[]) {
  if (rows.length === 0) {
    return todayIsoDate();
  }
  return addDaysToIsoDate(rows[rows.length - 1]?.date ?? todayIsoDate(), 1);
}

export function ReportCreateForm({
  hotels,
  compsets,
  uploads,
  defaultUploadBatchId,
}: {
  hotels: Array<{ id: string; name: string }>;
  compsets: Array<{
    id: string;
    name: string;
    subjectHotelId: string;
    members: Array<{
      hotelId: string;
      roleType: "SUBJECT" | "COMP";
      hotel: { name: string };
    }>;
  }>;
  uploads: Array<{
    id: string;
    fileName: string;
    subjectHotelId: string;
    compSetId: string;
    status: string;
    createdAt: string | Date;
    summaryJson: unknown;
  }>;
  defaultUploadBatchId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const preferredUpload = defaultUploadBatchId
    ? (uploads.find((u) => u.id === defaultUploadBatchId) ?? null)
    : null;

  const [subjectHotelId, setSubjectHotelId] = useState(
    preferredUpload?.subjectHotelId ?? hotels[0]?.id ?? "",
  );
  const filteredCompSets = compsets.filter(
    (item) => item.subjectHotelId === subjectHotelId,
  );
  const [compSetId, setCompSetId] = useState(
    preferredUpload?.compSetId ?? filteredCompSets[0]?.id ?? "",
  );

  const filteredUploads = uploads.filter(
    (u) => u.subjectHotelId === subjectHotelId && u.compSetId === compSetId,
  );

  const initialUploadBatchId =
    (defaultUploadBatchId &&
      filteredUploads.some((u) => u.id === defaultUploadBatchId) &&
      defaultUploadBatchId) ||
    filteredUploads[0]?.id ||
    "";

  const [uploadBatchId, setUploadBatchId] = useState(initialUploadBatchId);
  const [dataSource, setDataSource] = useState<"UPLOAD" | "MANUAL">(
    initialUploadBatchId ? "UPLOAD" : "MANUAL",
  );
  const [manualRows, setManualRows] = useState<ManualRateRow[]>([]);

  const selectedCompSet =
    compsets.find((item) => item.id === compSetId) ?? null;
  const manualHotels: ManualHotel[] = (selectedCompSet?.members ?? []).map(
    (member) => ({
      hotelId: member.hotelId,
      roleType: member.roleType,
      name: member.hotel.name,
    }),
  );
  const manualHotelIds = manualHotels.map((hotel) => hotel.hotelId);
  const manualHotelIdsKey = manualHotelIds.join("|");
  const updateManualRate = (rowId: string, hotelId: string, value: string) => {
    setManualRows((current) =>
      current.map((item) =>
        item.id === rowId
          ? {
              ...item,
              rates: {
                ...item.rates,
                [hotelId]: value,
              },
            }
          : item,
      ),
    );
  };

  const handleGridPaste = (
    event: ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    hotelIndex: number,
  ) => {
    const pastedText = event.clipboardData.getData("text/plain");
    if (
      !pastedText ||
      (!pastedText.includes("\t") && !pastedText.includes("\n"))
    ) {
      return;
    }

    const matrix = pastedText
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .map((line) => line.split("\t"));

    if (!matrix.length) {
      return;
    }

    event.preventDefault();

    setManualRows((current) => {
      const nextRows = [...current];
      const requiredRows = rowIndex + matrix.length;
      while (nextRows.length < requiredRows) {
        nextRows.push(
          createManualRow(manualHotelIds, getNextManualDate(nextRows)),
        );
      }

      return nextRows.map((row, currentRowIndex) => {
        if (
          currentRowIndex < rowIndex ||
          currentRowIndex >= rowIndex + matrix.length
        ) {
          return row;
        }

        const sourceValues = matrix[currentRowIndex - rowIndex] ?? [];
        if (sourceValues.length === 0) {
          return row;
        }

        const rates = { ...row.rates };
        sourceValues.forEach((sourceValue, sourceColumnIndex) => {
          const hotel = manualHotels[hotelIndex + sourceColumnIndex];
          if (!hotel) {
            return;
          }
          rates[hotel.hotelId] = sourceValue.replace(/[$,]/g, "").trim();
        });

        return {
          ...row,
          rates,
        };
      });
    });
  };

  useEffect(() => {
    const hotelIds = manualHotelIdsKey
      ? manualHotelIdsKey.split("|").filter(Boolean)
      : [];
    if (hotelIds.length === 0) {
      setManualRows([]);
      return;
    }

    setManualRows((current) => {
      if (current.length === 0) {
        return [createManualRow(hotelIds)];
      }

      return current.map((row) => ({
        ...row,
        rates: Object.fromEntries(
          hotelIds.map((hotelId) => [hotelId, row.rates[hotelId] ?? ""]),
        ),
      }));
    });
  }, [manualHotelIdsKey]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const reportName = String(formData.get("name") ?? "").trim();
        if (!reportName) {
          setError("Report name is required.");
          return;
        }

        if (dataSource === "UPLOAD" && !uploadBatchId) {
          setError(
            "Import an upload batch first (Uploads -> Import observations), then select it here.",
          );
          return;
        }

        const payload: Record<string, unknown> = {
          name: reportName,
          subjectHotelId,
          compSetId,
          dataSource,
        };

        if (dataSource === "UPLOAD") {
          payload.uploadBatchId = uploadBatchId;
        } else {
          const manualRates: Array<{
            hotelId: string;
            date: string;
            nightlyRate: number;
          }> = [];
          for (const row of manualRows) {
            const date = row.date?.trim();
            if (!date) {
              continue;
            }

            for (const hotel of manualHotels) {
              const rawValue = row.rates[hotel.hotelId]?.trim() ?? "";
              if (!rawValue) {
                continue;
              }
              const nightlyRate = Number(rawValue.replace(/[$,]/g, ""));
              if (!Number.isFinite(nightlyRate) || nightlyRate <= 0) {
                setError(`Invalid rate for ${hotel.name} on ${date}.`);
                return;
              }
              manualRates.push({
                hotelId: hotel.hotelId,
                date,
                nightlyRate,
              });
            }
          }

          const subjectHotel = manualHotels.find(
            (hotel) => hotel.roleType === "SUBJECT",
          );
          const compHotelIds = new Set(
            manualHotels
              .filter((hotel) => hotel.roleType === "COMP")
              .map((hotel) => hotel.hotelId),
          );
          const hasSubjectRate = subjectHotel
            ? manualRates.some((row) => row.hotelId === subjectHotel.hotelId)
            : false;
          const hasCompRate = manualRates.some((row) =>
            compHotelIds.has(row.hotelId),
          );

          if (!hasSubjectRate) {
            setError("Add at least one subject-hotel rate in manual mode.");
            return;
          }
          if (!hasCompRate) {
            setError("Add at least one competitor rate in manual mode.");
            return;
          }

          payload.manualRates = manualRates;
        }

        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to create report.");
          return;
        }
        router.push(`/reports/${result.id}`);
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Report name</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectHotelId">Subject hotel</Label>
        <Select
          id="subjectHotelId"
          name="subjectHotelId"
          value={subjectHotelId}
          onChange={(event) => {
            const nextSubjectHotelId = event.target.value;
            setSubjectHotelId(nextSubjectHotelId);
            const nextCompSets = compsets.filter(
              (item) => item.subjectHotelId === nextSubjectHotelId,
            );
            const nextCompSetId = nextCompSets[0]?.id ?? "";
            setCompSetId(nextCompSetId);
            const nextUploads = uploads.filter(
              (u) =>
                u.subjectHotelId === nextSubjectHotelId &&
                u.compSetId === nextCompSetId,
            );
            setUploadBatchId(nextUploads[0]?.id ?? "");
            setDataSource(nextUploads.length > 0 ? "UPLOAD" : "MANUAL");
            setError(null);
          }}
        >
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compSetId">CompSet</Label>
        <Select
          id="compSetId"
          name="compSetId"
          required
          disabled={filteredCompSets.length === 0}
          value={compSetId}
          onChange={(event) => {
            const next = event.target.value;
            setCompSetId(next);
            const nextUploads = uploads.filter(
              (u) =>
                u.subjectHotelId === subjectHotelId && u.compSetId === next,
            );
            setUploadBatchId(nextUploads[0]?.id ?? "");
            setDataSource(nextUploads.length > 0 ? "UPLOAD" : "MANUAL");
            setError(null);
          }}
        >
          {filteredCompSets.length > 0 ? (
            filteredCompSets.map((compSet) => (
              <option key={compSet.id} value={compSet.id}>
                {compSet.name}
              </option>
            ))
          ) : (
            <option value="">No compsets available</option>
          )}
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rate data source</Label>
        <div className="space-y-2 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="dataSource"
              value="UPLOAD"
              checked={dataSource === "UPLOAD"}
              onChange={() => {
                setDataSource("UPLOAD");
                setError(null);
              }}
              disabled={filteredUploads.length === 0}
            />
            Use imported upload file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="dataSource"
              value="MANUAL"
              checked={dataSource === "MANUAL"}
              onChange={() => {
                setDataSource("MANUAL");
                setError(null);
              }}
            />
            Enter rates manually
          </label>
        </div>
      </div>

      {dataSource === "UPLOAD" ? (
        <div className="space-y-2">
          <Label htmlFor="uploadBatchId">Upload batch (data source)</Label>
          <Select
            id="uploadBatchId"
            name="uploadBatchId"
            required
            disabled={filteredUploads.length === 0}
            value={uploadBatchId}
            onChange={(event) => setUploadBatchId(event.target.value)}
          >
            {filteredUploads.length > 0 ? (
              filteredUploads.map((u) => {
                const summary = u.summaryJson as {
                  inserted?: number;
                  updated?: number;
                } | null;
                const inserted = summary?.inserted ?? 0;
                const updated = summary?.updated ?? 0;
                const label = `${u.fileName} - ${u.status} - +${inserted}/~${updated}`;
                return (
                  <option key={u.id} value={u.id}>
                    {label}
                  </option>
                );
              })
            ) : (
              <option value="">No imported uploads for this compset</option>
            )}
          </Select>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm text-muted-foreground">
            Sheet view: hotels (including subject) and stay dates are preloaded.
            Enter nightly rates in USD and leave blanks where unavailable.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="w-[170px] pl-6">Date</TableHead>
                  {manualHotels.map((hotel) => (
                    <TableHead key={hotel.hotelId}>
                      <div className="font-medium text-foreground">
                        {hotel.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hotel.roleType === "SUBJECT" ? "Subject" : "Comp"}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[88px] text-right pr-6">Row</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualRows.map((row, rowIndex) => (
                  <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="pl-6">
                      <div className="font-medium">
                        {formatManualDateLabel(row.date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.date}
                      </div>
                    </TableCell>
                    {manualHotels.map((hotel, hotelIndex) => (
                      <TableCell key={`${row.id}-${hotel.hotelId}`}>
                        <Input
                          inputMode="decimal"
                          placeholder="Rate"
                          value={row.rates[hotel.hotelId] ?? ""}
                          onChange={(event) =>
                            updateManualRate(
                              row.id,
                              hotel.hotelId,
                              event.target.value,
                            )
                          }
                          onPaste={(event) =>
                            handleGridPaste(event, rowIndex, hotelIndex)
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-right align-top pr-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={manualRows.length <= 1}
                        onClick={() =>
                          setManualRows((current) =>
                            current.filter((item) => item.id !== row.id),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setManualRows((current) => [
                  ...current,
                  createManualRow(manualHotelIds, getNextManualDate(current)),
                ])
              }
              disabled={manualHotelIds.length === 0}
            >
              Add next date
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setManualRows((current) => {
                  const nextRows = [...current];
                  for (let i = 0; i < 6; i += 1) {
                    nextRows.push(
                      createManualRow(
                        manualHotelIds,
                        getNextManualDate(nextRows),
                      ),
                    );
                  }
                  return nextRows;
                })
              }
              disabled={manualHotelIds.length === 0}
            >
              Add next 6 dates
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: paste a block from Excel/Sheets directly into the first rate
            cell to fill multiple hotels/dates.
          </p>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        disabled={
          dataSource === "UPLOAD" ? !uploadBatchId : manualHotels.length === 0
        }
      >
        Create report
      </Button>
    </form>
  );
}
