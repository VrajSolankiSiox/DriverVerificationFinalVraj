"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ReportBuilderForm({
  report,
}: {
  report: {
    id: string;
    status: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          reportId: report.id,
          status: String(formData.get("status") ?? report.status),
        };
        const response = await fetch(`/api/reports/${report.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to update report.");
          return;
        }
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={report.status}>
          <option value="DRAFT">DRAFT</option>
          <option value="REVIEW_READY">REVIEW_READY</option>
          <option value="APPROVED">APPROVED</option>
          <option value="EXPORTED">EXPORTED</option>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Save report builder</Button>
    </form>
  );
}
