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
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="mb-2 font-semibold text-amber-800">Alerts need attention</h3>
      <ul className="space-y-2 text-sm text-amber-900">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start justify-between gap-4">
            <span>{alert.message}</span>
            <div className="flex shrink-0 gap-2">
              {alert.reportId && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/reports/${alert.reportId}`}>View report</Link>
                </Button>
              )}
              <form action={`/api/alerts/${alert.id}/acknowledge`} method="post">
                <Button type="submit" size="sm" variant="ghost">
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
