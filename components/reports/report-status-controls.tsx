"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function ReportStatusControls({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch(`/api/reports/${reportId}/approve`, { method: "POST" });
        setPending(false);
        router.refresh();
      }}
    >
      {pending ? "Approving..." : "Approve report"}
    </Button>
  );
}
