"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function UploadImportForm({ uploadBatchId, importMode }: { uploadBatchId: string; importMode: "APPEND_NEW" | "UPSERT_MATCHING" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const response = await fetch(`/api/uploads/${uploadBatchId}/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadBatchId, mode: importMode }),
          });
          const result = await response.json();
          setPending(false);
          if (!response.ok) {
            setError(result.error || "Failed to import upload batch.");
            return;
          }
          router.refresh();
        }}
      >
        {pending ? "Importing..." : "Import observations"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
