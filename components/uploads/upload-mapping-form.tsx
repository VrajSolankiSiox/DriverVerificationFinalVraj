"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { logicalUploadFields } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function UploadMappingForm({
  uploadBatchId,
  sourceName,
  headers,
  defaultMapping,
}: {
  uploadBatchId: string;
  sourceName: string;
  headers: string[];
  defaultMapping: Record<string, string | null>;
}) {
  const router = useRouter();
  const [mapping, setMapping] = useState<Record<string, string | null>>(defaultMapping);
  const [error, setError] = useState<string | null>(null);
  const [autoAddUnresolvedHotels, setAutoAddUnresolvedHotels] = useState(true);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = {
          uploadBatchId,
          sourceName,
          mapping,
          normalization: {
            dateFormat: String(formData.get("dateFormat") || ""),
            currencyDefault: String(formData.get("currencyDefault") || "USD"),
            stripCurrencySymbols: true,
            stripCommas: true,
          },
          saveTemplate: formData.get("saveTemplate") === "on",
          templateName: String(formData.get("templateName") || ""),
          autoAddUnresolvedHotels,
        };
        const response = await fetch(`/api/uploads/${uploadBatchId}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to validate mapping.");
          return;
        }
        router.refresh();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {logicalUploadFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}{field.required ? " *" : ""}</Label>
            <Select
              value={mapping[field.key] ?? ""}
              onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value || null }))}
            >
              <option value="">Unmapped</option>
              {headers.map((header) => (
                <option key={header} value={header}>{header}</option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date format override</Label>
          <Input id="dateFormat" name="dateFormat" placeholder="MM/dd/yyyy" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currencyDefault">Default currency</Label>
          <Input id="currencyDefault" name="currencyDefault" defaultValue="USD" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="templateName">Template name</Label>
          <Input id="templateName" name="templateName" placeholder="Expedia standard" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="saveTemplate" /> Save as reusable template
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={autoAddUnresolvedHotels}
          onChange={(event) => setAutoAddUnresolvedHotels(event.target.checked)}
        />
        Auto-add unmatched hotels to compset (recommended)
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Validate mapping</Button>
    </form>
  );
}
