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

  const progressPct = ((index + 1) / Math.max(slides.length, 1)) * 100;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#020617_50%,_#020617_100%)] text-white lg:grid-cols-[320px_1fr]">
      <aside className="hidden border-r border-slate-700/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.95)_0%,rgba(2,6,23,0.97)_100%)] p-6 lg:block">
        <div className="mb-6 rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-[0_24px_60px_-40px_rgba(59,130,246,0.45)]">
          <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Presentation</p>
          <p className="mt-2 text-xl font-semibold text-white">Executive Story Mode</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">One focused message per slide, with visuals and clear takeaways.</p>
        </div>
        <div className="space-y-2.5">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              className={`w-full rounded-2xl border px-3.5 py-3 text-left text-sm transition ${
                slideIndex === index
                  ? "border-blue-300/70 bg-gradient-to-r from-blue-500/30 to-indigo-500/25 text-white"
                  : "border-slate-700 bg-slate-900/55 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70"
              }`}
              onClick={() => setIndex(slideIndex)}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${slideIndex === index ? "bg-blue-200" : "bg-slate-500"}`}
                />
                <span className="truncate font-medium">{slide.title}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="relative flex min-h-screen min-h-0 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(43,95,255,0.25),transparent_42%),radial-gradient(circle_at_88%_85%,rgba(43,95,255,0.18),transparent_36%)]" />
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-blue-200">
              Presentation Mode
            </span>
            {demoMode && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-slate-900">Demo</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm text-slate-300">{progress}</span>
            <Button variant="secondary" className="rounded-xl border border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => setIndex((value) => Math.max(value - 1, 0))}>
              Prev
            </Button>
            <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-500" onClick={() => setIndex((value) => Math.min(value + 1, slides.length - 1))}>Next</Button>
          </div>
        </div>
        <div className="relative h-1 w-full bg-slate-900/70">
          <div
            className="h-full bg-primary shadow-[0_0_20px_rgba(43,95,255,0.65)] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <section className="flex-1 min-h-0 p-6 md:p-8">
          <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-[1500px] flex-col gap-4">
            <div className="relative flex h-[calc(100vh-160px)] min-h-0 flex-col overflow-hidden rounded-[40px] border border-white/60 bg-white/95 text-slate-900 shadow-2xl backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-primary/30 via-primary to-primary/25 shadow-[0_0_24px_rgba(43,95,255,0.7)]" />
              <div className="border-b border-slate-100/90 bg-[linear-gradient(120deg,rgba(43,95,255,0.12),rgba(255,255,255,0.72)_42%,rgba(43,95,255,0.08))] px-10 py-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-700">{current.title}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden p-10 text-[1.06rem] leading-8">
                {current.body}
              </div>
            </div>

            {demoMode && current.talkingPoint ? (
              <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-900/45 to-amber-800/30 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">What to say</div>
                <p className="text-sm leading-6 text-amber-100">{current.talkingPoint}</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

export type { Slide };
