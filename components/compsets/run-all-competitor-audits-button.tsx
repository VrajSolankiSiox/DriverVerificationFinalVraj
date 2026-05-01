"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";

export function RunAllCompetitorAuditsButton({
  competitorHotelIds,
}: {
  competitorHotelIds: string[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runAll = async () => {
    if (running || competitorHotelIds.length === 0) return;

    setRunning(true);
    setProgress(0);

    let success = 0;
    let failed = 0;

    try {
      for (let i = 0; i < competitorHotelIds.length; i += 1) {
        setProgress(i + 1);
        const hotelId = competitorHotelIds[i];
        try {
          const response = await fetch("/api/website-audits/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hotelId }),
          });
          if (response.ok) {
            success += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }

      if (success > 0) {
        toast.success(`Completed ${success} competitor website audit${success === 1 ? "" : "s"}.`);
      }
      if (failed > 0) {
        toast.error(`Failed ${failed} competitor website audit${failed === 1 ? "" : "s"}.`);
      }
      router.refresh();
    } finally {
      setRunning(false);
      setProgress(0);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={runAll}
      disabled={running || competitorHotelIds.length === 0}
    >
      {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {running ? `Running ${progress}/${competitorHotelIds.length}...` : "Run all competitor audits"}
    </Button>
  );
}
