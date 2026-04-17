"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { compsetSchema } from "@/lib/validations/compset";

export function CompSetForm({ hotels }: { hotels: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(compsetSchema),
    defaultValues: {
      name: "",
      expediaUrl: "",
      subjectHotelId: "",
      compHotels: [{ hotelName: "", expediaLink: "" }],
    },
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "compHotels",
  });

  const addHotel = () => {
    if (fields.length < 10) {
      append({ hotelName: "", expediaLink: "" });
    }
  };

  const selectedSubjectHotelId = form.watch("subjectHotelId");

  return (
    <form
      className="space-y-8"
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
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Info</h3>
        <div className="space-y-2">
          <Label htmlFor="name">Compset Name</Label>
          <Input id="name" {...form.register("name")} placeholder="Enter compset name" />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expediaUrl">Expedia URL (for OTA data fetching)</Label>
          <Input
            id="expediaUrl"
            {...form.register("expediaUrl")}
            placeholder="https://www.expedia.com/..."
            type="url"
          />
          {form.formState.errors.expediaUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.expediaUrl.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Subject Hotel</h3>
        <p className="text-sm text-muted-foreground">Select the main property for this compset.</p>
        <div className="space-y-2">
          <Label htmlFor="subjectHotelId">Subject Hotel</Label>
          <Select id="subjectHotelId" {...form.register("subjectHotelId")}>
            <option value="">Select a subject hotel...</option>
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </Select>
          {form.formState.errors.subjectHotelId && (
            <p className="text-sm text-destructive">{form.formState.errors.subjectHotelId.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Competitive Hotels</h3>
            <p className="text-sm text-muted-foreground">
              Select up to 10 competitors ({fields.length}/10 selected).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addHotel}
            disabled={fields.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>

        <datalist id="competitor-hotels-list">
          {hotels
            .filter((hotel) => hotel.id !== selectedSubjectHotelId)
            .map((hotel) => (
              <option key={hotel.id} value={hotel.name}>
                {hotel.name}
              </option>
            ))}
        </datalist>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
              <div className="space-y-2">
                <Label htmlFor={`compHotels.${index}.hotelName`}>Competitor {index + 1}</Label>
                <Input
                  id={`compHotels.${index}.hotelName`}
                  list="competitor-hotels-list"
                  placeholder="Select or enter hotel name..."
                  {...form.register(`compHotels.${index}.hotelName` as const)}
                />
                {form.formState.errors.compHotels?.[index]?.hotelName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.compHotels[index]?.hotelName?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`compHotels.${index}.expediaLink`}>Expedia Link</Label>
                <Input
                  id={`compHotels.${index}.expediaLink`}
                  {...form.register(`compHotels.${index}.expediaLink` as const)}
                  placeholder="https://www.expedia.com/..."
                  type="url"
                />
                {form.formState.errors.compHotels?.[index]?.expediaLink && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.compHotels[index]?.expediaLink?.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {form.formState.errors.compHotels && typeof form.formState.errors.compHotels.message === "string" && (
          <p className="text-sm text-destructive">{form.formState.errors.compHotels.message}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {form.formState.isSubmitting ? "Creating Compset..." : "Create Compset"}
      </Button>
    </form>
  );
}
