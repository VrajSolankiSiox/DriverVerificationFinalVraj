"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { compsetSchema } from "@/lib/validations/compset";

export function CompSetForm({
  hotels,
}: {
  hotels: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(compsetSchema),
    defaultValues: {
      name: "",
      subjectHotelId: hotels[0]?.id ?? "",
      version: 1,
      notes: "",
      memberHotelIds: [] as string[],
    },
  });

  const selectedSubject = form.watch("subjectHotelId");
  const selectedMembers = form.watch("memberHotelIds") ?? [];

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const response = await fetch("/api/compsets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to create compset.");
          return;
        }
        router.push(`/compsets/${result.id}`);
        router.refresh();
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="name">CompSet name</Label>
        <Input id="name" {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subjectHotelId">Subject hotel</Label>
        <Select id="subjectHotelId" {...form.register("subjectHotelId")}>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...form.register("notes")} />
      </div>
      <div className="space-y-3">
        <Label>Comp members</Label>
        <div className="grid gap-2 md:grid-cols-2">
          {hotels
            .filter((hotel) => hotel.id !== selectedSubject)
            .map((hotel) => {
              const checked = selectedMembers.includes(hotel.id);
              return (
                <label key={hotel.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedMembers, hotel.id]
                        : selectedMembers.filter((value) => value !== hotel.id);
                      form.setValue("memberHotelIds", next, { shouldValidate: true });
                    }}
                  />
                  <span className="text-sm">{hotel.name}</span>
                </label>
              );
            })}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">Create compset</Button>
    </form>
  );
}
