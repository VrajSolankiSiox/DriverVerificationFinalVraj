"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ReportCreateForm({
  hotels,
  compsets,
}: {
  hotels: Array<{ id: string; name: string }>;
  compsets: Array<{ id: string; name: string; subjectHotelId: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subjectHotelId, setSubjectHotelId] = useState(hotels[0]?.id ?? "");
  const filteredCompSets = compsets.filter((item) => item.subjectHotelId === subjectHotelId);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const payload = Object.fromEntries(formData.entries());
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
          onChange={(event) => setSubjectHotelId(event.target.value)}
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
        <Select id="compSetId" name="compSetId" required>
          {filteredCompSets.map((compSet) => (
            <option key={compSet.id} value={compSet.id}>
              {compSet.name}
            </option>
          ))}
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Create report</Button>
    </form>
  );
}
