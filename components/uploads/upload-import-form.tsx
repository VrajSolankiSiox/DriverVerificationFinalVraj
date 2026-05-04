"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";

export function UploadImportForm({ uploadBatchId, importMode }: { uploadBatchId: string; importMode: "APPEND_NEW" | "UPSERT_MATCHING" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lastResult, setLastResult] = useState<null | {
    inserted: number;
    updated: number;
    skipped: number;
    totalRows: number;
    validRows: number;
  }>(null);

  const storageKey = `upload-import-result:${uploadBatchId}`;

  useEffect(() => {
    const cached = sessionStorage.getItem(storageKey);
    if (!cached) return;
    try {
      setLastResult(JSON.parse(cached));
    } catch {
      // ignore
    }
  }, [storageKey]);

  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          setLastResult(null);
          try {
            const response = await fetch(`/api/uploads/${uploadBatchId}/import`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uploadBatchId, mode: importMode }),
            });
            const text = await response.text();
            const result = text
              ? (JSON.parse(text) as { error?: string; inserted?: number; updated?: number; skipped?: number; totalRows?: number; validRows?: number })
              : {};
            setPending(false);
            if (!response.ok) {
              setError(result.error || "Failed to import upload batch.");
              toast.error(result.error || "Failed to import upload batch.");
              return;
            }
            const computed = {
              inserted: result.inserted ?? 0,
              updated: result.updated ?? 0,
              skipped: result.skipped ?? 0,
              totalRows: result.totalRows ?? 0,
              validRows: result.validRows ?? 0,
            };
            setLastResult(computed);
            sessionStorage.setItem(storageKey, JSON.stringify(computed));

            if (computed.validRows === 0) {
              toast.warning("No valid rows to import. Check Validation summary (unresolved hotels / missing mapping).");
            } else {
              toast.success(`Imported +${computed.inserted} / ~${computed.updated} (skipped ${computed.skipped}).`);
            }

            setTimeout(() => router.refresh(), 250);
          } catch (e) {
            setPending(false);
            setError("Failed to import upload batch.");
            toast.error("Failed to import upload batch.");
          }
        }}
      >
        {pending ? "Importing..." : "Import observations"}
      </Button>
      {lastResult ? (
        <div className="text-sm text-muted-foreground">
          Imported: +{lastResult.inserted} / ~{lastResult.updated} (skipped {lastResult.skipped}; valid {lastResult.validRows}/{lastResult.totalRows})
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
