"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type Alert = {
  id: string;
  metric: string;
  message: string;
  severity: string;
  reportId: string | null;
  hotelId: string | null;
};

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,1),rgba(255,247,237,0.95))] p-5 shadow-[0_24px_54px_-36px_rgba(180,83,9,0.35)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-amber-950">Alerts needing attention</h3>
          <p className="text-sm text-amber-800">These are the items most likely to need a second look before sharing the report.</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          {alerts.length} active
        </div>
      </div>
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[22px] border border-amber-100 bg-white/75 p-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{alert.metric}</div>
              <p className="text-sm leading-6 text-slate-700">{alert.message}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {alert.reportId ? (
                <Button asChild size="sm" variant="outline" className="border-amber-200 bg-white text-amber-900 hover:bg-amber-50">
                  <Link href={`/reports/${alert.reportId}`}>View report</Link>
                </Button>
              ) : null}
              <form action={`/api/alerts/${alert.id}/acknowledge`} method="post">
                <Button type="submit" size="sm" variant="ghost" className="text-amber-900 hover:bg-amber-100">
                  Dismiss
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
