"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, ZoomIn } from "lucide-react";

type Screenshot = {
  id: string;
  platform: string;
  reviewStatus: string;
  imageDataUrl: string;
  capturedAt: Date;
};

export function HotelScreenshotGallery({
  screenshots,
}: {
  screenshots: Screenshot[];
  hotelId: string;
}) {
  const [items] = useState(screenshots);
  const [activeImage, setActiveImage] = useState<Screenshot | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No response screenshots uploaded yet.</p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-3 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.platform}
                </p>
                <p className="text-[11px] text-slate-500">Status: {item.reviewStatus}</p>
                <p className="text-xs text-slate-400">
                  {format(new Date(item.capturedAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {/* Image */}
            <button
              type="button"
              className="relative block w-full overflow-hidden"
              onClick={() => setActiveImage(item)}
            >
              <img
                src={item.imageDataUrl}
                alt={`${item.platform} review response screenshot`}
                className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                <ZoomIn className="h-8 w-8 text-white opacity-0 drop-shadow-lg transition-opacity duration-200 group-hover:opacity-100" />
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {activeImage.platform} — Review Response Screenshot
                </p>
                <p className="text-xs text-slate-500">
                  {format(new Date(activeImage.capturedAt), "MMM d, yyyy")} · Status:{" "}
                  {activeImage.reviewStatus}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveImage(null)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-auto flex justify-center bg-slate-50">
              <img
                src={activeImage.imageDataUrl}
                alt={`${activeImage.platform} review response screenshot`}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
