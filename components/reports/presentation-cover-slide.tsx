import type { ReactNode } from "react";

type Slide = {
  id: string;
  title: string;
  body: ReactNode;
  talkingPoint?: string;
  takeaway?: string;
};

export function PresentationCoverSlide({
  title,
  hotelName,
  city,
  country,
  compHotelNames,
}: {
  title: string;
  hotelName: string;
  city?: string | null;
  country?: string | null;
  compHotelNames: string[];
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-700">
          Presentation Deck
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-lg text-slate-700">
          Your Hotel: <span className="font-semibold">{hotelName}</span>
          {city || country ? ` | ${city ?? ""}${city && country ? ", " : ""}${country ?? ""}` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          CompSet Hotels ({compHotelNames.length})
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {compHotelNames.length ? (
            compHotelNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-sm font-medium text-blue-800"
              >
                {name}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No competitor hotels selected.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Slide };
