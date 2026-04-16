"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compsetSchema } from "@/lib/validations/compset";

export function CompSetForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(compsetSchema),
    defaultValues: {
      name: "",
      expediaUrl: "",
      hotels: [{ hotelName: "", expediaLink: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "hotels",
  });

  const addHotel = () => {
    if (fields.length < 10) {
      append({ hotelName: "", expediaLink: "" });
    }
  };

  const removeHotel = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

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
        <Label htmlFor="name">Compset Name</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Enter compset name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
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
          <p className="text-sm text-destructive">
            {form.formState.errors.expediaUrl.message}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Hotels ({fields.length}/10)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addHotel}
            disabled={fields.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Hotel
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`hotels.${index}.hotelName`}>Hotel Name</Label>
                <Input
                  id={`hotels.${index}.hotelName`}
                  {...form.register(`hotels.${index}.hotelName`)}
                  placeholder="Enter hotel name"
                />
                {form.formState.errors.hotels?.[index]?.hotelName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.hotels[index]?.hotelName?.message}
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor={`hotels.${index}.expediaLink`}>
                  Expedia Link
                </Label>
                <Input
                  id={`hotels.${index}.expediaLink`}
                  {...form.register(`hotels.${index}.expediaLink`)}
                  placeholder="https://www.expedia.com/..."
                  type="url"
                />
                {form.formState.errors.hotels?.[index]?.expediaLink && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.hotels[index]?.expediaLink?.message}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeHotel(index)}
                disabled={fields.length <= 1}
                className="mb-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {form.formState.errors.hotels &&
          typeof form.formState.errors.hotels.message === "string" && (
            <p className="text-sm text-destructive">
              {form.formState.errors.hotels.message}
            </p>
          )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit">Create Compset</Button>
    </form>
  );
}
