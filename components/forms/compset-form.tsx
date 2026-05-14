"use client";

import { useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { compsetSchema } from "@/lib/validations/compset";

type CompHotelRowInput = {
  hotelName: string;
  starRating: number;
  roomCount: number;
  ratings: {
    google: string;
    expedia: string;
    booking: string;
    agoda: string;
    priceline: string;
    // tripadvisor: string;
  };
  organicSearchPositions: {
    expedia: string;
    bookingCom: string;
    priceline: string;
    google: string;
  };
};

const EMPTY_COMP_HOTEL_ROW: CompHotelRowInput = {
  hotelName: "",
  starRating: 0,
  roomCount: 1,
  ratings: {
    google: "",
    expedia: "",
    booking: "",
    agoda: "",
    priceline: "",
    // tripadvisor: "",
  },
  organicSearchPositions: {
    expedia: "1",
    bookingCom: "1",
    priceline: "1",
    google: "1",
  },
};

function SpreadsheetTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[860px] text-sm">{children}</table>
    </div>
  );
}

export function CompSetForm({
  subjectHotels,
  competitorHotels,
  defaultValues,
  compSetId,
}: {
  subjectHotels: { id: string; name: string }[];
  competitorHotels: { id: string; name: string }[];
  defaultValues?: {
    name?: string;
    subjectHotelId?: string;
    compHotels?: Array<Partial<CompHotelRowInput>>;
  };
  compSetId?: string;
}) {
  const router = useRouter();
  const isEditMode = Boolean(compSetId);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(compsetSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      subjectHotelId: defaultValues?.subjectHotelId ?? "",
      compHotels:
        defaultValues?.compHotels?.length
          ? defaultValues.compHotels.map((row) => ({
              hotelName: row.hotelName ?? "",
              starRating: row.starRating ?? 0,
              roomCount: row.roomCount ?? 1,
              ratings: {
                google: row.ratings?.google ?? "",
                expedia: row.ratings?.expedia ?? "",
                booking: row.ratings?.booking ?? "",
                agoda: row.ratings?.agoda ?? "",
                priceline: row.ratings?.priceline ?? "",
                // tripadvisor: row.ratings?.tripadvisor ?? "",
              },
              organicSearchPositions: {
                expedia: row.organicSearchPositions?.expedia ?? "1",
                bookingCom: row.organicSearchPositions?.bookingCom ?? "1",
                priceline: row.organicSearchPositions?.priceline ?? "1",
                google: row.organicSearchPositions?.google ?? "1",
              },
            }))
          : [{ ...EMPTY_COMP_HOTEL_ROW }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "compHotels",
  });

  const selectedSubjectHotelId = form.watch("subjectHotelId");
  const watchedCompHotels = form.watch("compHotels");

  const addHotel = () => {
    append({ ...EMPTY_COMP_HOTEL_ROW });
  };

  return (
    <form
      className="space-y-8"
      onSubmit={form.handleSubmit(
        async (values) => {
          setError(null);

          const response = await fetch(
            isEditMode ? `/api/compsets/${compSetId}` : "/api/compsets",
            {
              method: isEditMode ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            },
          );
          const result = await response.json();
          if (!response.ok) {
            setError(result.error || (isEditMode ? "Failed to update compset." : "Failed to create compset."));
            toast.error(result.error || "Failed to save compset.");
            return;
          }
          toast.success(isEditMode ? "Compset updated successfully." : "Compset created successfully.");
          router.push(`/compsets/${result.id}`);
          router.refresh();
        },
        () => {
          toast.error("Please fix the form errors before submitting.");
        },
      )}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Info</h3>
        <div className="space-y-2">
          <Label htmlFor="name">Compset Name</Label>
          <Input id="name" {...form.register("name")} placeholder="Enter compset name" />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Main Property</h3>
        <div className="space-y-2">
          <Label htmlFor="subjectHotelId">Main Property</Label>
          {isEditMode ? (
            <>
              <Input
                id="subjectHotelId"
                value={subjectHotels.find((hotel) => hotel.id === selectedSubjectHotelId)?.name ?? ""}
                disabled
              />
              <input type="hidden" {...form.register("subjectHotelId")} />
            </>
          ) : (
            <Select id="subjectHotelId" {...form.register("subjectHotelId")}>
              <option value="">Select a main property...</option>
              {subjectHotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </Select>
          )}
          {form.formState.errors.subjectHotelId ? (
            <p className="text-sm text-destructive">{form.formState.errors.subjectHotelId.message}</p>
          ) : null}
        </div>
      </div>

      <datalist id="competitor-hotels-list">
        {competitorHotels
          .filter((hotel) => hotel.id !== selectedSubjectHotelId)
          .map((hotel) => (
            <option key={hotel.id} value={hotel.name} />
          ))}
      </datalist>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Step 1: Add Competitor Hotels</h3>
            <p className="text-sm text-muted-foreground">Add hotels first, then fill ratings and organic positions below.</p>
          </div>
          <Button type="button" variant="outline" onClick={addHotel}>
            <Plus className="mr-2 h-4 w-4" />
            Add Hotel
          </Button>
        </div>

        <SpreadsheetTable>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Hotel Name</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Star Rating</th>
              <th className="px-3 py-2 text-left font-medium text-slate-700">Room Count</th>
              <th className="px-3 py-2 text-right font-medium text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-t border-slate-200">
                <td className="px-3 py-2 align-top">
                  <Input
                    list="competitor-hotels-list"
                    placeholder="Hotel name"
                    {...form.register(`compHotels.${index}.hotelName` as const)}
                  />
                  {form.formState.errors.compHotels?.[index]?.hotelName ? (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.compHotels[index]?.hotelName?.message}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    placeholder="4.3"
                    {...form.register(`compHotels.${index}.starRating` as const, { valueAsNumber: true })}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <Input
                    type="number"
                    min={1}
                    placeholder="120"
                    {...form.register(`compHotels.${index}.roomCount` as const, { valueAsNumber: true })}
                  />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </SpreadsheetTable>
      </div>

      {fields.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 2: Ratings Table</h3>
          <p className="text-sm text-muted-foreground">Enter each rating as `9.5 (200)` where the number in parentheses is reviewer count.</p>
          <SpreadsheetTable>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Hotel</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Google Rating</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Expedia Rating</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Booking Rating</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Agoda Rating</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Priceline Rating</th>
                {/* <th className="px-3 py-2 text-left font-medium text-slate-700">TripAdvisor Rating</th> */}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={`ratings-${field.id}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {watchedCompHotels?.[index]?.hotelName?.trim() || `Hotel ${index + 1}`}
                  </td>
                  <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.google` as const)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.expedia` as const)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.booking` as const)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.agoda` as const)} />
                  </td>
                  <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.priceline` as const)} />
                  </td>
                  {/* <td className="px-3 py-2">
                    <Input placeholder="9.5 (200) or X" {...form.register(`compHotels.${index}.ratings.tripadvisor` as const)} />
                  </td> */}
                </tr>
              ))}
            </tbody>
          </SpreadsheetTable>
          {typeof form.formState.errors.compHotels?.message === "string" ? (
            <p className="text-sm text-destructive">{form.formState.errors.compHotels.message}</p>
          ) : null}
        </div>
      ) : null}

      {fields.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Step 3: Organic Search Position Table</h3>
          <SpreadsheetTable>
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Hotel</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Expedia</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Booking.com</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Priceline</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">Google</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={`organic-${field.id}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {watchedCompHotels?.[index]?.hotelName?.trim() || `Hotel ${index + 1}`}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder="1 or X"
                      {...form.register(`compHotels.${index}.organicSearchPositions.expedia` as const)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder="1 or X"
                      {...form.register(`compHotels.${index}.organicSearchPositions.bookingCom` as const)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder="1 or X"
                      {...form.register(`compHotels.${index}.organicSearchPositions.priceline` as const)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      placeholder="1 or X"
                      {...form.register(`compHotels.${index}.organicSearchPositions.google` as const)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </SpreadsheetTable>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {form.formState.isSubmitting
          ? isEditMode
            ? "Updating CompSet..."
            : "Creating CompSet..."
          : isEditMode
            ? "Update CompSet"
            : "Create CompSet"}
      </Button>
    </form>
  );
}
