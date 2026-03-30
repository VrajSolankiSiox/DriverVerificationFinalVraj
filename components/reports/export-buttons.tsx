"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ExportButtons({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger(type: "PPTX" | "PDF", visibility: "CLIENT_SAFE" | "INTERNAL_FULL") {
    setPending(`${type}-${visibility}`);
    setError(null);
    const response = await fetch(`/api/reports/${reportId}/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, visibility }),
    });
    const result = await response.json();
    setPending(null);
    if (!response.ok) {
      setError(result.error || "Export failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => trigger("PPTX", "CLIENT_SAFE")} disabled={pending !== null}>Client PPTX</Button>
        <Button variant="outline" onClick={() => trigger("PDF", "CLIENT_SAFE")} disabled={pending !== null}>Client PDF</Button>
        <Button variant="secondary" onClick={() => trigger("PPTX", "INTERNAL_FULL")} disabled={pending !== null}>Internal PPTX</Button>
        <Button variant="outline" onClick={() => trigger("PDF", "INTERNAL_FULL")} disabled={pending !== null}>Internal PDF</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
