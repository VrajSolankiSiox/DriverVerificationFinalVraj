"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

type GalleryHotel = {
  hotelId: string;
  hotelName: string;
  screenshots: Array<{ platform: string; imageDataUrl: string | null; capturedAt: string; presence: "RESPONDED" | "NOT_RESPONDED" | "NO_PRESENCE" | "NO_REVIEW" }>;
};
const BASE_PLATFORMS = ["google", "expedia", "booking", "tripadvisor"];

function formatPlatform(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "google") return "Google";
  if (normalized === "expedia") return "Expedia";
  if (normalized === "booking") return "Booking";
  if (normalized === "agoda") return "Agoda";
  if (normalized === "priceline") return "Priceline";
  return value;
}

export function ReviewResponseGallery({ hotels }: { hotels: GalleryHotel[] }) {
  const [activeImage, setActiveImage] = useState<{ url: string; title: string } | null>(null);
  const visibleHotels = useMemo(
    () =>
      hotels.map((hotel) => {
        const byPlatform = new Map(hotel.screenshots.map((item) => [item.platform.toLowerCase(), item]));
        const fullList = BASE_PLATFORMS.map((platform) => {
          const existing = byPlatform.get(platform);
          if (existing) return existing;
          return {
            platform,
            imageDataUrl: null,
            capturedAt: new Date().toISOString(),
            presence: "NO_PRESENCE" as const,
          };
        });
        return { ...hotel, screenshots: fullList };
      }),
    [hotels],
  );

  return (
    <div className="space-y-6">
      {visibleHotels.map((hotel) => (
        <div key={hotel.hotelId} className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{hotel.hotelName}</h4>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {hotel.screenshots.map((item, index) => (
              <div key={`${hotel.hotelId}-${item.platform}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{formatPlatform(item.platform)}</p>
                  <p className="text-xs text-slate-400">{format(new Date(item.capturedAt), "MMM d, yyyy")}</p>
                  <p
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.presence === "RESPONDED"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.presence === "NOT_RESPONDED"
                          ? "bg-amber-100 text-amber-700"
                          : item.presence === "NO_REVIEW"
                            ? "bg-black text-white"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.presence === "RESPONDED"
                      ? "Responded"
                      : item.presence === "NOT_RESPONDED"
                        ? "Not Responded"
                        : item.presence === "NO_REVIEW"
                          ? "No Review"
                          : "No Presence / Zero Reviews"}
                  </p>
                </div>
                {item.imageDataUrl ? (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() =>
                      setActiveImage({
                        url: item.imageDataUrl!,
                        title: `${hotel.hotelName} - ${formatPlatform(item.platform)}`,
                      })
                    }
                  >
                    <img
                      src={item.imageDataUrl}
                      alt={`${hotel.hotelName} ${formatPlatform(item.platform)} review response screenshot`}
                      className="h-48 w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-50 text-center text-xs text-slate-500">
                    Screenshot not uploaded.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {activeImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setActiveImage(null)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{activeImage.title}</p>
              <button type="button" className="rounded-md border px-2 py-1 text-xs text-slate-600" onClick={() => setActiveImage(null)}>
                Close
              </button>
            </div>
            <img src={activeImage.url} alt={activeImage.title} className="max-h-[80vh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
