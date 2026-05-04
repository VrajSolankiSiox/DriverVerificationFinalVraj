"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Globe, ToggleLeft, ToggleRight, Star, X } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { compsetSchema, OTA_PLATFORMS, type OtaPlatform } from "@/lib/validations/compset";

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
    compHotels?: Array<{
      hotelName?: string;
      websiteUrl?: string;
      bookingUrl?: string;
      expediaLink?: string;
      otaRatings?: Record<string, string | number>;
    }>;
  };
  compSetId?: string;
}) {
  const router = useRouter();
  const isEditMode = Boolean(compSetId);
  const [error, setError] = useState<string | null>(null);
  const [runningAudits, setRunningAudits] = useState(false);
  const [hasRunAudits, setHasRunAudits] = useState(false);
  const [seoEnabled, setSeoEnabled] = useState(
    () =>
      defaultValues?.compHotels?.some(
        (comp) => Boolean(comp.websiteUrl) || Boolean(comp.bookingUrl) || Boolean(comp.expediaLink),
      ) ?? false,
  );

  // ── Multi-platform state (UI only, not in form schema) ──
  const [selectedPlatforms, setSelectedPlatforms] = useState<OtaPlatform[]>(() => {
    const keys = new Set<string>();
    for (const compHotel of defaultValues?.compHotels ?? []) {
      Object.keys(compHotel.otaRatings ?? {}).forEach((key) => keys.add(key));
    }
    return OTA_PLATFORMS.filter((platform) => keys.has(platform));
  });
  const [platformPickerValue, setPlatformPickerValue] = useState<string>("");

  const addPlatform = () => {
    const val = platformPickerValue as OtaPlatform;
    if (!val || selectedPlatforms.includes(val)) return;
    setSelectedPlatforms((prev) => [...prev, val]);
    setPlatformPickerValue("");
  };

  const removePlatform = (platform: OtaPlatform) => {
    setSelectedPlatforms((prev) => prev.filter((p) => p !== platform));
  };

  // Available platforms = those not yet added
  const availablePlatforms = OTA_PLATFORMS.filter(
    (p) => !selectedPlatforms.includes(p)
  );

  const [auditResultByHotelName, setAuditResultByHotelName] = useState<
    Record<
      string,
      {
        status: "SUCCESS" | "FAILED" | "SKIPPED_NO_WEBSITE";
        websiteScore: number | null;
        seoScore: number | null;
        error?: string;
      }
    >
  >({});

  const form = useForm({
    resolver: zodResolver(compsetSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      subjectHotelId: defaultValues?.subjectHotelId ?? "",
      compHotels:
        defaultValues?.compHotels?.length
          ? defaultValues.compHotels.map((compHotel) => ({
              hotelName: compHotel.hotelName ?? "",
              websiteUrl: compHotel.websiteUrl ?? "",
              bookingUrl: compHotel.bookingUrl ?? "",
              expediaLink: compHotel.expediaLink ?? "",
              otaRatings: compHotel.otaRatings ?? ({} as Record<string, string | number>),
            }))
          : [
              {
                hotelName: "",
                websiteUrl: "",
                bookingUrl: "",
                expediaLink: "",
                otaRatings: {} as Record<string, string | number>,
              },
            ],
    },
  });

  const { fields, append } = useFieldArray({
    control: form.control,
    name: "compHotels",
  });

  const selectedSubjectHotelId = form.watch("subjectHotelId");
  const watchedCompHotels = form.watch("compHotels");

  const normalizeHotelKey = (value: string) => value.trim().toLowerCase();

  const addHotel = () => {
    if (fields.length < 10) {
      append({
        hotelName: "",
        websiteUrl: "",
        bookingUrl: "",
        expediaLink: "",
        otaRatings: {} as Record<string, string | number>,
      });
    }
  };

  const runAllWebsiteAudits = async () => {
    setError(null);
    setRunningAudits(true);
    try {
      const response = await fetch("/api/compsets/run-website-audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compHotels: form.getValues("compHotels") }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to run website audits.");
        return;
      }

      const attempted = Number(result?.attempted ?? 0);
      const successCount = Number(result?.successCount ?? 0);
      const failedCount = Number(result?.failedCount ?? 0);
      const skippedMissingWebsite = Number(result?.skippedMissingWebsite ?? 0);
      const auditResults = Array.isArray(result?.auditResults) ? result.auditResults : [];

      const next: typeof auditResultByHotelName = {};
      for (const item of auditResults) {
        const name = String(item?.hotelName ?? "").trim();
        const key = normalizeHotelKey(name);
        if (!key) continue;
        next[key] = {
          status: item?.status,
          websiteScore: Number.isFinite(Number(item?.websiteScore)) ? Number(item?.websiteScore) : null,
          seoScore: Number.isFinite(Number(item?.seoScore)) ? Number(item?.seoScore) : null,
          error: item?.error ? String(item.error) : undefined,
        };
      }
      setAuditResultByHotelName(next);

      if (successCount > 0) toast.success(`Completed ${successCount} competitor website audit${successCount === 1 ? "" : "s"}.`);
      if (failedCount > 0) toast.error(`Failed ${failedCount} competitor website audit${failedCount === 1 ? "" : "s"}.`);
      if (attempted === 0 || skippedMissingWebsite > 0) toast.warning("Some competitors were skipped because website URL is missing.");

      setHasRunAudits(attempted > 0);
    } catch {
      setError("Failed to run website audits.");
    } finally {
      setRunningAudits(false);
    }
  };

  return (
    <form
      className="space-y-8"
      onSubmit={form.handleSubmit(async (values) => {
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
          return;
        }
        router.push(`/compsets/${result.id}`);
        router.refresh();
      })}
    >
      {/* ── Basic Info ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Info</h3>
        <div className="space-y-2">
          <Label htmlFor="name">Compset Name</Label>
          <Input id="name" {...form.register("name")} placeholder="Enter compset name" />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
      </div>

      {/* ── Main Property ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Main Property</h3>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Main property is locked when editing an existing compset."
            : "Select the main property for this compset."}
        </p>
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
                <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
              ))}
            </Select>
          )}
          {form.formState.errors.subjectHotelId && (
            <p className="text-sm text-destructive">{form.formState.errors.subjectHotelId.message}</p>
          )}
        </div>
      </div>

      {/* ── Competitive Hotels ── */}
      <div className="space-y-5">

        {/* Section header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium">Competitive Hotels</h3>
            <p className="text-sm text-muted-foreground">
              Select up to 10 competitors ({fields.length}/10 selected).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* SEO Toggle */}
            <button
              type="button"
              id="seo-toggle"
              onClick={() => setSeoEnabled((v) => !v)}
              aria-pressed={seoEnabled}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                seoEnabled
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-muted/40 text-muted-foreground",
              ].join(" ")}
            >
              {seoEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              <Globe className="h-3.5 w-3.5" />
              SEO
            </button>

            <Button type="button" variant="outline" size="sm" onClick={addHotel} disabled={fields.length >= 10}>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>
        </div>

        {/* SEO info banner */}
        {seoEnabled && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Globe className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              SEO mode is <strong>on</strong>. Fill in the URL fields on each competitor to enable SEO audits.
            </span>
          </div>
        )}

        {/* ── OTA Platform multi-selector ── */}
        <div className="rounded-xl border border-muted/60 bg-muted/10 p-4 space-y-3 shadow-sm">
          <div>
            <Label>OTA Platforms</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add one or more platforms — a rating field will appear for each competitor below.
            </p>
          </div>

          {/* Picker row */}
          <div className="flex items-center gap-2">
            <Select
              id="ota-platform-picker"
              value={platformPickerValue}
              onChange={(e) => setPlatformPickerValue(e.target.value)}
              className="max-w-[220px]"
            >
              <option value="">— Select platform —</option>
              {availablePlatforms.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </Select>
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

          {/* Selected platform tags */}
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

          {selectedPlatforms.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No platforms added yet.</p>
          )}
        </div>

        {/* Competitor hotel cards */}
        <datalist id="competitor-hotels-list">
          {competitorHotels
            .filter((hotel) => hotel.id !== selectedSubjectHotelId)
            .map((hotel) => (
              <option key={hotel.id} value={hotel.name}>{hotel.name}</option>
            ))}
        </datalist>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-muted/60 bg-muted/10 p-4 space-y-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Competitor {index + 1}
              </p>

              {/* Hotel name */}
              <div className="space-y-2">
                <Label htmlFor={`compHotels.${index}.hotelName`}>Hotel Name</Label>
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

              {/* OTA Ratings — one input per selected platform */}
              {selectedPlatforms.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-dashed border-muted/50">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Ratings
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedPlatforms.map((platform) => (
                      <div key={platform} className="space-y-1.5">
                        <Label htmlFor={`compHotels.${index}.otaRatings.${platform}`}>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {platform}
                          </span>
                        </Label>
                        <Input
                          id={`compHotels.${index}.otaRatings.${platform}`}
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          placeholder="0 – 10"
                          {...form.register(
                            `compHotels.${index}.otaRatings.${platform}` as `compHotels.${number}.otaRatings.${string}`
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL fields — shown only when SEO is on */}
              {seoEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-dashed border-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor={`compHotels.${index}.websiteUrl`}>Website URL</Label>
                    <Input
                      id={`compHotels.${index}.websiteUrl`}
                      {...form.register(`compHotels.${index}.websiteUrl` as const)}
                      placeholder="https://www.examplehotel.com"
                      type="url"
                    />
                    {form.formState.errors.compHotels?.[index]?.websiteUrl && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.compHotels[index]?.websiteUrl?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`compHotels.${index}.bookingUrl`}>Booking URL</Label>
                    <Input
                      id={`compHotels.${index}.bookingUrl`}
                      {...form.register(`compHotels.${index}.bookingUrl` as const)}
                      placeholder="https://www.booking.com/..."
                      type="url"
                    />
                    {form.formState.errors.compHotels?.[index]?.bookingUrl && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.compHotels[index]?.bookingUrl?.message}
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
              )}

              {/* Audit result badge */}
              {(() => {
                const hotelName = watchedCompHotels?.[index]?.hotelName ?? "";
                const result = auditResultByHotelName[normalizeHotelKey(hotelName)];
                if (!result) return null;
                if (result.status === "SUCCESS") {
                  return (
                    <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      Audit complete. Website Score: <strong>{result.websiteScore ?? "–"}</strong> | SEO Score: <strong>{result.seoScore ?? "–"}</strong>
                    </div>
                  );
                }
                if (result.status === "FAILED") {
                  return (
                    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                      Audit failed{result.error ? `: ${result.error}` : "."}
                    </div>
                  );
                }
                return (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Skipped: add website URL to run audit.
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {form.formState.errors.compHotels &&
          typeof form.formState.errors.compHotels.message === "string" && (
            <p className="text-sm text-destructive">{form.formState.errors.compHotels.message}</p>
          )}

        {/* Run audits — only when SEO is on */}
        {seoEnabled && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={runAllWebsiteAudits}
              disabled={runningAudits || form.formState.isSubmitting}
            >
              {runningAudits ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {runningAudits ? "Running Website Audits..." : "Run All Website Audits"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Run this before saving to enable competitor SEO comparison.
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting || runningAudits}>
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {form.formState.isSubmitting
            ? isEditMode
              ? "Updating CompSet..."
              : "Creating CompSet..."
            : isEditMode
              ? "Update CompSet"
              : "Create CompSet"}
        </Button>
        {!hasRunAudits && seoEnabled && (
          <p className="text-xs text-amber-700">
            Without competitor website audits, SEO score comparison will not be available.
          </p>
        )}
      </div>
    </form>
  );
}
