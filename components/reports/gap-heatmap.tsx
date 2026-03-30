import { formatCurrency } from "@/lib/utils";

export function GapHeatmap({
  rows,
}: {
  rows: Array<{ date: string; gapToCompAverage: number | null }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
      {rows.slice(0, 24).map((row) => {
        const gap = row.gapToCompAverage ?? 0;
        const className = gap <= -15 ? "bg-blue-100 text-blue-900" : gap >= 15 ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-900";
        return (
          <div key={row.date} className={`rounded-lg p-3 text-sm ${className}`}>
            <div className="font-medium">{row.date}</div>
            <div>{formatCurrency(gap)}</div>
          </div>
        );
      })}
    </div>
  );
}
