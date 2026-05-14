import type { CompetitiveGap } from "@/lib/reports/competitive-gaps";

function isAlertGap(verdict: string) {
  return verdict.includes("Leaving") || verdict.includes("bouncing") || verdict.includes("invisible");
}

export function CompetitiveGapsGrid({ gaps }: { gaps: CompetitiveGap[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {gaps.map((gap) => {
        const alertGap = isAlertGap(gap.verdict);

        return (
          <div
            key={gap.metric}
            className={`rounded-[24px] border p-5 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.28)] transition-colors ${
              alertGap
                ? "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,1),rgba(255,247,237,0.95))]"
                : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.95))]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{gap.metric}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
                  alertGap ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {alertGap ? "Watch" : "Stable"}
              </span>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{gap.subjectValue}</div>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              {gap.compAverage != null ? <div>vs {gap.compAverage}</div> : null}
              {gap.rank != null ? <div>{gap.rank}</div> : null}
            </div>
            <div className={`mt-4 text-sm leading-6 ${alertGap ? "text-amber-900" : "text-slate-700"}`}>{gap.verdict}</div>
          </div>
        );
      })}
    </div>
  );
}
