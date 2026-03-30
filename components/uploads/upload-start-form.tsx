"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function UploadStartForm({
  hotels,
  compsets,
}: {
  hotels: Array<{ id: string; name: string }>;
  compsets: Array<{ id: string; name: string; subjectHotelId: string }>;
}) {
  const router = useRouter();
  const [subjectHotelId, setSubjectHotelId] = useState(hotels[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const filteredCompSets = compsets.filter((compSet) => compSet.subjectHotelId === subjectHotelId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to create upload batch.");
          return;
        }
        router.push(`/uploads/${result.id}`);
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="sourceName">Source name</Label>
        <Input id="sourceName" name="sourceName" defaultValue="Expedia" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subjectHotelId">Subject hotel</Label>
        <Select id="subjectHotelId" name="subjectHotelId" value={subjectHotelId} onChange={(event) => setSubjectHotelId(event.target.value)}>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="compSetId">CompSet</Label>
        <Select id="compSetId" name="compSetId" required>
          {filteredCompSets.map((compSet) => (
            <option key={compSet.id} value={compSet.id}>{compSet.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="importMode">Import mode</Label>
        <Select id="importMode" name="importMode" defaultValue="APPEND_NEW">
          <option value="APPEND_NEW">APPEND_NEW</option>
          <option value="UPSERT_MATCHING">UPSERT_MATCHING</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="file">Expedia rate file</Label>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls,.csv" required />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Upload file</Button>
    </form>
  );
}
