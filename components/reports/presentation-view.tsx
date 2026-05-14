"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type Slide = {
  id: string;
  title: string;
  body: ReactNode;
  talkingPoint?: string;
  takeaway?: string;
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
    <div className="grid min-h-screen grid-cols-1 bg-slate-950 text-white lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-slate-800/90 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.22),_rgba(2,6,23,1)_62%)] p-5 lg:block">
        <div className="mb-6 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Presentation</p>
          <p className="mt-2 text-lg font-semibold text-white">Executive Story Mode</p>
          <p className="mt-2 text-xs text-slate-400">One focused message per slide, with visuals and clear takeaways.</p>
        </div>
        <div className="space-y-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                slideIndex === index
                  ? "border-blue-400/70 bg-blue-500/20 text-white"
                  : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
              }`}
              onClick={() => setIndex(slideIndex)}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${slideIndex === index ? "bg-blue-300" : "bg-slate-600"}`}
                />
                <span className="truncate">{slide.title}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              Presentation Mode
            </span>
            {demoMode && <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-medium">Demo</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{progress}</span>
            <Button variant="secondary" onClick={() => setIndex((value) => Math.max(value - 1, 0))}>
              Prev
            </Button>
            <Button onClick={() => setIndex((value) => Math.min(value + 1, slides.length - 1))}>Next</Button>
          </div>
        </div>

        <section className="flex-1 p-5 md:p-7">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
              <div className="border-b border-slate-100 bg-slate-50/70 px-7 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{current.title}</p>
              </div>
              <div className="flex-1 overflow-auto p-7">{current.body}</div>
              {current.takeaway ? (
                <div className="border-t border-slate-200 bg-blue-50/70 px-7 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Takeaway</p>
                  <p className="mt-1 text-sm text-slate-800">{current.takeaway}</p>
                </div>
              ) : null}
            </div>

            {demoMode && current.talkingPoint ? (
              <div className="rounded-xl border border-amber-600/50 bg-amber-950/50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">What to say</div>
                <p className="text-sm text-amber-100">{current.talkingPoint}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
