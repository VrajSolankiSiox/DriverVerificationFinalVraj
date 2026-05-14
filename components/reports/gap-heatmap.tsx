import { formatCurrency } from "@/lib/utils";

function getGapStyles(gap: number) {
  // Positive gap (Above Comps) -> Red shading
  if (gap >= 30) {
    return "border-red-300 bg-red-300 text-red-950";
  }
  if (gap >= 20) {
    return "border-red-200 bg-red-200 text-red-950";
  }
  if (gap >= 10) {
    return "border-red-100 bg-red-100 text-red-900";
  }
  if (gap > 3) {
    return "border-red-50 bg-red-50 text-red-800";
  }

  // Negative gap (Below Comps) -> Blue shading
  if (gap <= -30) {
    return "border-blue-300 bg-blue-300 text-blue-950";
  }
  if (gap <= -20) {
    return "border-blue-200 bg-blue-200 text-blue-950";
  }
  if (gap <= -10) {
    return "border-blue-100 bg-blue-100 text-blue-900";
  }
  if (gap < -3) {
    return "border-blue-50 bg-blue-50 text-blue-800";
  }

  // Parity
  return "border-slate-200 bg-white text-slate-900";
}

export function GapHeatmap({
  rows,
}: {
  rows: Array<{ date: string; gapToCompAverage: number | null }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-blue-900 font-medium">Below comps</span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 font-medium">Near parity</span>
        <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-red-900 font-medium">Above comps</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-max grid-flow-col grid-rows-4 gap-3 auto-cols-[160px]">
          {rows.map((row) => {
            const gap = row.gapToCompAverage ?? 0;
            return (
              <div
                key={row.date}
                className={`rounded-[20px] border p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.35)] transition-colors ${getGapStyles(gap)}`}
              >
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">{row.date}</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight">{formatCurrency(gap)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
