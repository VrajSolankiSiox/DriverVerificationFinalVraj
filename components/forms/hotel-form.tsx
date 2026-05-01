"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, Plus, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hotelSchema, type HotelInput } from "@/lib/validations/hotel";
import { OTA_PLATFORMS, type OtaPlatform } from "@/lib/validations/compset";

export function HotelForm({
  defaultValues,
  hotelId,
}: {
  defaultValues?: Partial<HotelInput>;
  hotelId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  console.log(error);

  // ── Multi-platform OTA state (UI only) ──
  const [selectedPlatforms, setSelectedPlatforms] = useState<OtaPlatform[]>(
    () => {
      const existing = defaultValues?.otaRatings;
      if (!existing) return [];
      return Object.keys(existing).filter((k) =>
        OTA_PLATFORMS.includes(k as OtaPlatform)
      ) as OtaPlatform[];
    }
  );
  const [platformPickerValue, setPlatformPickerValue] = useState("");

  const availablePlatforms = OTA_PLATFORMS.filter(
    (p) => !selectedPlatforms.includes(p)
  );

  const addPlatform = () => {
    const val = platformPickerValue as OtaPlatform;
    if (!val || selectedPlatforms.includes(val)) return;
    setSelectedPlatforms((prev) => [...prev, val]);
    setPlatformPickerValue("");
  };

  const removePlatform = (platform: OtaPlatform) => {
    setSelectedPlatforms((prev) => prev.filter((p) => p !== platform));
  };

  const form = useForm<HotelInput>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      isSubject: defaultValues?.isSubject ?? false,
      brand: defaultValues?.brand ?? "",
      addressLine1: defaultValues?.addressLine1 ?? "",
      addressLine2: defaultValues?.addressLine2 ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      country: defaultValues?.country ?? "United States",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      bookingUrl: defaultValues?.bookingUrl ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      roomCount: defaultValues?.roomCount ?? undefined,
      starLevel: defaultValues?.starLevel ?? undefined,
      ownershipNotes: defaultValues?.ownershipNotes ?? "",
      managementNotes: defaultValues?.managementNotes ?? "",
      otaRatings: defaultValues?.otaRatings ?? {},
    },
  });

  return (
    <form
      className="grid gap-6 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const response = await fetch(
          hotelId ? `/api/hotels/${hotelId}` : "/api/hotels",
          {
            method: hotelId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }
        );
        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error);
          setError(result.error || "Failed to save hotel.");
          return;
        }
        router.push(`/hotels/${result.id}`);
        router.refresh();
      })}
    >
      {/* ── Property Name ── */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Property name</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      {/* ── Subject Hotel checkbox ── */}
      <div className="flex items-center space-x-2 md:col-span-2">
        <input
          type="checkbox"
          id="isSubject"
          {...form.register("isSubject")}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="isSubject" className="font-medium">
          This is a Subject Hotel (can be used to create a CompSet)
        </Label>
      </div>

      {/* ── Brand ── */}
      <div className="space-y-2">
        <Label htmlFor="brand">Brand / flag</Label>
        <select
          id="brand"
          {...form.register("brand")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select brand...</option>
          <option value="Marriott">Marriott</option>
          <option value="Hilton">Hilton</option>
          <option value="IHG">IHG</option>
          <option value="Hyatt">Hyatt</option>
          <option value="Wyndham">Wyndham</option>
          <option value="Choice">Choice</option>
          <option value="Best Western">Best Western</option>
          <option value="La Quinta">La Quinta</option>
          <option value="Hampton">Hampton</option>
          <option value="Holiday Inn">Holiday Inn</option>
          <option value="Independent">Independent</option>
          <option value="G-6">G-6</option>
          <option value="Sonesta">Sonesta</option>
          <option value="Red Roof">Red Roof</option>
          <option value="Radisson">Radisson</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* ── Room Count ── */}
      <div className="space-y-2">
        <Label htmlFor="roomCount">Room count</Label>
        <Input
          id="roomCount"
          type="number"
          {...form.register("roomCount", { valueAsNumber: true })}
        />
      </div>

      {/* ── Address ── */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="addressLine1">Address</Label>
        <Input id="addressLine1" {...form.register("addressLine1")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" {...form.register("city")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input id="state" {...form.register("state")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" {...form.register("country")} />
      </div>

      {/* ── Star Level ── */}
      <div className="space-y-2">
        <Label htmlFor="starLevel">Star level</Label>
        <select
          id="starLevel"
          defaultValue=""
          {...form.register("starLevel", { valueAsNumber: true })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>Select rating</option>
          <option value={1}>⭐</option>
          <option value={2}>⭐⭐</option>
          <option value={3}>⭐⭐⭐</option>
          <option value={4}>⭐⭐⭐⭐</option>
          <option value={5}>⭐⭐⭐⭐⭐</option>
        </select>
      </div>

      {/* ── Website / Booking URLs ── */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="websiteUrl">Website URL (Will be used for auditing)</Label>
        <Input
          id="websiteUrl"
          type="url"
          placeholder="https://www.example.com"
          {...form.register("websiteUrl")}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="bookingUrl">Booking URL</Label>
        <Input id="bookingUrl" type="url" {...form.register("bookingUrl")} />
      </div>

      {/* ── Contact ── */}
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...form.register("phone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
      </div>

      {/* ── OTA Platform Ratings ── */}
      <div className="md:col-span-2 rounded-xl border border-muted/60 bg-muted/10 p-4 space-y-3 shadow-sm">
        <div>
          <Label>OTA Platform Ratings</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add one or more platforms and enter this hotel&apos;s rating for each.
          </p>
        </div>

        {/* Picker row */}
        <div className="flex items-center gap-2">
          <select
            id="ota-platform-picker"
            value={platformPickerValue}
            onChange={(e) => setPlatformPickerValue(e.target.value)}
            className="flex h-10 max-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Select platform —</option>
            {availablePlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPlatform}
            disabled={!platformPickerValue}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Platform tags */}
        {selectedPlatforms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
              >
                <Star className="h-3 w-3 text-amber-500" />
                {platform}
                <button
                  type="button"
                  onClick={() => removePlatform(platform)}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  aria-label={`Remove ${platform}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Rating inputs grid */}
        {selectedPlatforms.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-dashed border-muted/50">
            {selectedPlatforms.map((platform) => (
              <div key={platform} className="space-y-1.5">
                <Label htmlFor={`otaRatings.${platform}`}>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    {platform}
                  </span>
                </Label>
                <Input
                  id={`otaRatings.${platform}`}
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder="0 – 10"
                  {...form.register(
                    `otaRatings.${platform}` as `otaRatings.${OtaPlatform}`
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No platforms added yet.
          </p>
        )}
      </div>

      {/* ── Submit ── */}
      <div className="md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {form.formState.isSubmitting
            ? hotelId
              ? "Updating..."
              : "Creating..."
            : hotelId
              ? "Update hotel"
              : "Create hotel"}
        </Button>
      </div>
    </form>
  );
}
