"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hotelSchema, type HotelInput } from "@/lib/validations/hotel";
import { OTA_PLATFORMS, type OtaPlatform } from "@/lib/validations/compset";

const REVIEW_RESPONSE_PLATFORMS = [
  "google",
  "expedia",
  "booking",
  "tripadvisor",
] as const;
type ReviewResponsePlatform = (typeof REVIEW_RESPONSE_PLATFORMS)[number];
type ReviewPresenceState = "RESPONDED" | "NOT_RESPONDED" | "NO_PRESENCE" | "NO_REVIEW";

const REVIEW_STATUS_META: Record<
  ReviewPresenceState,
  { label: string; className: string }
> = {
  RESPONDED: { label: "Responded", className: "bg-green-100 text-green-700" },
  NOT_RESPONDED: {
    label: "Not Responded",
    className: "bg-yellow-100 text-yellow-800",
  },
  NO_PRESENCE: { label: "No Presence", className: "bg-red-100 text-red-700" },
  NO_REVIEW: { label: "No Review", className: "bg-black text-white" },
};

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read uploaded file."));
    reader.readAsDataURL(file);
  });
}

export function HotelForm({
  defaultValues,
  hotelId,
}: {
  defaultValues?: Partial<HotelInput>;
  hotelId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // TripAdvisor hidden from Create/Edit Hotel OTA inputs per product request.
  const [selectedPlatforms] = useState<OtaPlatform[]>(
    OTA_PLATFORMS.filter((platform) => platform !== "TripAdvisor") as OtaPlatform[],
  );

  const [reviewResponseScreenshots, setReviewResponseScreenshots] = useState<
    Partial<Record<ReviewResponsePlatform, string>>
  >(() => {
    const seed = defaultValues?.reviewResponseScreenshots ?? {};
    return Object.fromEntries(
      Object.entries(seed).filter(
        ([, value]) => typeof value === "string" && value.length > 0,
      ),
    ) as Partial<Record<ReviewResponsePlatform, string>>;
  });

  const escapeKey = (key: string) => key.replace(/\./g, "___");
  const unescapeKey = (key: string) => key.replace(/___/g, ".");

  const escapedOtaRatings: Record<string, string> = {};
  if (defaultValues?.otaRatings) {
    Object.entries(defaultValues.otaRatings).forEach(([k, v]) => {
      escapedOtaRatings[escapeKey(k)] = String(v ?? "").trim();
    });
  }

  const form = useForm<HotelInput>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      brand: defaultValues?.brand ?? "",
      addressLine1: defaultValues?.addressLine1 ?? "",
      addressLine2: defaultValues?.addressLine2 ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      country: defaultValues?.country ?? "United States",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      bookingUrl: defaultValues?.bookingUrl ?? "",
      ownerName: defaultValues?.ownerName ?? "",
      salesPerson: defaultValues?.salesPerson ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      roomCount: defaultValues?.roomCount ?? undefined,
      starLevel: defaultValues?.starLevel ?? undefined,
      ownershipNotes: defaultValues?.ownershipNotes ?? "",
      managementNotes: defaultValues?.managementNotes ?? "",
      reviewResponded: true,
      reviewResponseScreenshots: defaultValues?.reviewResponseScreenshots,
      reviewResponsePresence: defaultValues?.reviewResponsePresence,
      otaRatings: escapedOtaRatings,
      organicSearchPositions: {
        google:
          defaultValues?.organicSearchPositions?.google ??
          "",
        expedia:
          defaultValues?.organicSearchPositions?.expedia ??
          "",
        bookingCom:
          defaultValues?.organicSearchPositions?.bookingCom ??
          "",
        priceline:
          defaultValues?.organicSearchPositions?.priceline ??
          "",
      },
    },
  });

  const updateScreenshot = async (
    platform: ReviewResponsePlatform,
    file: File | null,
  ) => {
    if (!file) {
      setReviewResponseScreenshots((prev) => ({ ...prev, [platform]: "" }));
      return;
    }

    try {
      const dataUrl = await toDataUrl(file);
      setReviewResponseScreenshots((prev) => ({
        ...prev,
        [platform]: dataUrl,
      }));
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to process screenshot.",
      );
    }
  };

  const handleDropScreenshot = (
    event: React.DragEvent<HTMLLabelElement>,
    platform: ReviewResponsePlatform,
  ) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    void updateScreenshot(platform, droppedFile);
  };

  return (
    <form
      className="grid gap-6 md:grid-cols-2"
      onSubmit={form.handleSubmit(
        async (values) => {
          setError(null);

          const unescapedOtaRatings: Record<string, string> = {};
          if (values.otaRatings) {
            Object.entries(values.otaRatings).forEach(([k, v]) => {
              unescapedOtaRatings[unescapeKey(k)] = String(v ?? "").trim();
            });
          }

          const reviewResponsePresence = REVIEW_RESPONSE_PLATFORMS.reduce(
            (acc, platform) => {
              const explicit = values.reviewResponsePresence?.[platform];
              const hasScreenshot = Boolean(reviewResponseScreenshots[platform]);
              acc[platform] =
                explicit ?? (values.reviewResponded && hasScreenshot ? "RESPONDED" : "NO_PRESENCE");
              return acc;
            },
            {} as Record<ReviewResponsePlatform, ReviewPresenceState>,
          );

          const payload = {
            ...values,
            reviewResponded: true,
            otaRatings: unescapedOtaRatings,
            reviewResponseScreenshots,
            reviewResponsePresence,
          };

          const response = await fetch(
            hotelId ? `/api/hotels/${hotelId}` : "/api/hotels",
            {
              method: hotelId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          const result = await response.json();
          if (!response.ok) {
            toast.error(result.error || "Failed to save hotel.");
            setError(result.error || "Failed to save hotel.");
            return;
          }
          toast.success(
            hotelId
              ? "Hotel updated successfully."
              : "Hotel created successfully.",
          );
          router.push(`/hotels/${result.id}`);
          router.refresh();
        },
        () => {
          toast.error("Please fix the errors in the form before submitting.");
        },
      )}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Property name</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="space-y-4 rounded-2xl border bg-muted/20 p-5 shadow-sm md:col-span-2">
          <div>
            <p className="text-sm font-semibold">Upload Response Screenshots</p>
            <p className="text-xs text-muted-foreground">
              If a platform has no uploaded screenshot, it is stored as No
              Presence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {REVIEW_RESPONSE_PLATFORMS.map((platform) => {
              const previewUrl = reviewResponseScreenshots[platform];
              const status =
                (form.watch(`reviewResponsePresence.${platform}` as const) as
                  | ReviewPresenceState
                  | undefined) ?? "NO_PRESENCE";
              const statusMeta = REVIEW_STATUS_META[status];
              return (
                <div
                  key={platform}
                  className="rounded-xl border bg-background p-4 space-y-3 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <Label className="capitalize font-medium">{platform}</Label>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Review Status</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={form.watch(`reviewResponsePresence.${platform}` as const) ?? "NO_PRESENCE"}
                      onChange={(event) =>
                        form.setValue(
                          `reviewResponsePresence.${platform}` as const,
                          event.target.value as ReviewPresenceState,
                          { shouldValidate: true },
                        )
                      }
                    >
                      <option value="RESPONDED">Responded</option>
                      <option value="NOT_RESPONDED">Not Responded</option>
                      <option value="NO_PRESENCE">No Presence</option>
                      <option value="NO_REVIEW">No Review</option>
                    </select>
                  </div>

                  {/* Upload area */}
                  <label
                    htmlFor={`review-screenshot-${platform}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDropScreenshot(event, platform)}
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed p-4 text-center hover:bg-muted/40 transition"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`${platform} preview`}
                        className="max-h-40 rounded-md object-cover"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Click or drag to upload
                      </div>
                    )}
                  </label>

                  <Input
                    id={`review-screenshot-${platform}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      updateScreenshot(
                        platform,
                        event.target.files?.[0] ?? null,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="roomCount">Room count</Label>
        <Input
          id="roomCount"
          type="number"
          {...form.register("roomCount", { valueAsNumber: true })}
        />
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="starLevel">Star level</Label>
        <select
          id="starLevel"
          defaultValue=""
          {...form.register("starLevel", { valueAsNumber: true })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            Select rating
          </option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5</option>
        </select>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="websiteUrl">
          Website URL (Will be used for auditing)
        </Label>
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

      <div className="space-y-2">
        <Label htmlFor="ownerName">Hotel owner name</Label>
        <Input id="ownerName" placeholder="Optional" {...form.register("ownerName")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="salesPerson">Sales person</Label>
        <Input id="salesPerson" placeholder="Name of assigned sales rep" {...form.register("salesPerson")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...form.register("phone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
      </div>

      <div className="space-y-3 rounded-xl border border-muted/60 bg-muted/10 p-4 shadow-sm md:col-span-2">
        <div>
          <Label>OTA Platform Ratings</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add one or more platforms and enter this hotel&apos;s rating for
            each.
          </p>
        </div>

        <p className="text-xs italic text-muted-foreground">
          All OTA platforms are enabled by default except TripAdvisor. Use `9.5 (200)` or `X`.
        </p>

        {selectedPlatforms.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-muted/50 pt-2 md:grid-cols-3">
            {selectedPlatforms.map((platform) => (
              <div key={platform} className="space-y-1.5">
                <Label htmlFor={`otaRatings.${escapeKey(platform)}`}>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    {platform}
                  </span>
                </Label>
                <Input
                  id={`otaRatings.${escapeKey(platform)}`}
                  type="text"
                  placeholder="9.5 (200) or X"
                  {...form.register(
                    `otaRatings.${escapeKey(platform)}` as `otaRatings.${OtaPlatform}`,
                  )}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-muted/60 bg-muted/10 p-4 shadow-sm md:col-span-2">
        <div>
          <Label>Organic Search Positions</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set main property search positions. Use `X` when unavailable or sold out.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="organic-google">Google</Label>
            <Input id="organic-google" type="text" placeholder="1 or X" {...form.register("organicSearchPositions.google")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organic-expedia">Expedia</Label>
            <Input id="organic-expedia" type="text" placeholder="1 or X" {...form.register("organicSearchPositions.expedia")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organic-booking">Booking.com</Label>
            <Input id="organic-booking" type="text" placeholder="1 or X" {...form.register("organicSearchPositions.bookingCom")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organic-priceline">Priceline</Label>
            <Input id="organic-priceline" type="text" placeholder="1 or X" {...form.register("organicSearchPositions.priceline")} />
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive md:col-span-2">{error}</p>
      ) : null}

      <div className="md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
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
