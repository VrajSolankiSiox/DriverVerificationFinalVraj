"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type SlideDefinition = { id: string; title: string; editable: boolean };

export function PresentationEditor({
  presentation,
  reportId,
  slides,
}: {
  presentation: {
    id: string;
    name: string;
    reportTitleOverride: string | null;
    slideTitlesJson: Record<string, string>;
  };
  reportId: string;
  slides: SlideDefinition[];
}) {
  const [name, setName] = useState(presentation.name);
  const [reportTitle, setReportTitle] = useState(presentation.reportTitleOverride ?? "");
  const [slideTitles, setSlideTitles] = useState<Record<string, string>>(presentation.slideTitlesJson ?? {});
  const [status, setStatus] = useState("Saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo(
    () => ({
      name,
      reportTitleOverride: reportTitle.trim() ? reportTitle : null,
      slideTitlesJson: slideTitles,
    }),
    [name, reportTitle, slideTitles],
  );

  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    setStatus("Saving...");
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/presentations/${presentation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setStatus("Saved");
      } catch {
        setStatus("Save failed");
      }
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [payload, presentation.id]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Presentation editor</h2>
          <span className="text-sm text-slate-500">{status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Slide 2 (Competitor Hotels selection) is presenter-controlled and is never saved.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Saved presentation name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-md border px-3 text-sm"
          />

          <label className="block text-sm font-medium text-slate-700">Report title override</label>
          <input
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            className="h-10 w-full rounded-md border px-3 text-sm"
          />
        </div>

        <div className="rounded-xl border bg-white p-5 space-y-3">
          <p className="text-sm font-medium text-slate-700">Slide titles</p>
          {slides.map((slide, idx) => (
            <div key={slide.id} className="space-y-1">
              <p className="text-xs text-slate-500">Slide {idx + 1}</p>
              <input
                disabled={!slide.editable}
                value={slideTitles[slide.id] ?? slide.title}
                onChange={(e) =>
                  setSlideTitles((prev) => ({
                    ...prev,
                    [slide.id]: e.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-slate-100"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/reports/${reportId}/present?presentationId=${presentation.id}`}>Present</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/presentations">Back to Presentations</Link>
        </Button>
      </div>
    </div>
  );
}
