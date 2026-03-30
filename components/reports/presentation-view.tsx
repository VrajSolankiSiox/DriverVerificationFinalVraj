"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Slide = {
  id: string;
  title: string;
  body: ReactNode;
  talkingPoint?: string;
};

export function PresentationView({ slides, demoMode = false }: { slides: Slide[]; demoMode?: boolean }) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((value) => Math.min(value + 1, slides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setIndex((value) => Math.max(value - 1, 0));
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [slides.length]);

  const progress = useMemo(() => `${index + 1} / ${slides.length}`, [index, slides.length]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-950 text-white lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-800 bg-slate-900 p-4 lg:block">
        <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Sections</div>
        <div className="space-y-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${slideIndex === index ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
              onClick={() => setIndex(slideIndex)}
            >
              {slide.title}
            </button>
          ))}
        </div>
      </aside>
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">Presentation Mode</span>
            {demoMode && <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-medium">Demo</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{progress}</span>
            <Button variant="secondary" onClick={() => setIndex((value) => Math.max(value - 1, 0))}>Prev</Button>
            <Button onClick={() => setIndex((value) => Math.min(value + 1, slides.length - 1))}>Next</Button>
          </div>
        </div>
        <section className="flex-1 p-8">
          <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
            <div className="flex flex-1 flex-col rounded-2xl bg-white p-10 text-slate-900 shadow-2xl">
              <div className="mb-6 text-sm uppercase tracking-wide text-slate-500">{current.title}</div>
              <div className="flex-1 overflow-auto">{current.body}</div>
            </div>
            {demoMode && (current as Slide & { talkingPoint?: string }).talkingPoint && (
              <div className="rounded-xl border border-amber-600/50 bg-amber-950/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">What to say</div>
                <p className="text-sm text-amber-100">{(current as Slide & { talkingPoint?: string }).talkingPoint}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
