"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ReportBuilderForm({
  report,
}: {
  report: {
    id: string;
    executiveSummary?: string | null;
    manualOpportunityNotes?: string | null;
    methodologyNote?: string | null;
    status: string;
    sections: Array<{ id: string; title: string; displayOrder: number; enabled: boolean; visibility: "CLIENT_SAFE" | "INTERNAL_ONLY" }>;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState(report.sections);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          reportId: report.id,
          executiveSummary: String(formData.get("executiveSummary") ?? ""),
          manualOpportunityNotes: String(formData.get("manualOpportunityNotes") ?? ""),
          methodologyNote: String(formData.get("methodologyNote") ?? ""),
          status: String(formData.get("status") ?? report.status),
          sectionOrder: sections,
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
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="executiveSummary">Executive summary override</Label>
          <Textarea id="executiveSummary" name="executiveSummary" defaultValue={report.executiveSummary ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manualOpportunityNotes">Opportunity notes override</Label>
          <Textarea id="manualOpportunityNotes" name="manualOpportunityNotes" defaultValue={report.manualOpportunityNotes ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="methodologyNote">Methodology / disclaimer</Label>
          <Textarea id="methodologyNote" name="methodologyNote" defaultValue={report.methodologyNote ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={report.status}>
            <option value="DRAFT">DRAFT</option>
            <option value="REVIEW_READY">REVIEW_READY</option>
            <option value="APPROVED">APPROVED</option>
            <option value="EXPORTED">EXPORTED</option>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Sections</h3>
        <div className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_120px_160px_120px] md:items-center">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={section.enabled}
                  onChange={(event) => {
                    const next = [...sections];
                    next[index] = { ...section, enabled: event.target.checked };
                    setSections(next);
                  }}
                />
                <div>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-muted-foreground">ID: {section.id}</div>
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Order</Label>
                <Input
                  type="number"
                  value={section.displayOrder}
                  onChange={(event) => {
                    const next = [...sections];
                    next[index] = { ...section, displayOrder: Number(event.target.value) };
                    setSections(next);
                  }}
                />
              </div>
              <div>
                <Label className="mb-1 block">Visibility</Label>
                <Select
                  value={section.visibility}
                  onChange={(event) => {
                    const next = [...sections];
                    next[index] = { ...section, visibility: event.target.value as "CLIENT_SAFE" | "INTERNAL_ONLY" };
                    setSections(next);
                  }}
                >
                  <option value="CLIENT_SAFE">CLIENT_SAFE</option>
                  <option value="INTERNAL_ONLY">INTERNAL_ONLY</option>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Save report builder</Button>
    </form>
  );
}
