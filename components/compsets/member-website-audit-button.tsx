"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";

export function MemberWebsiteAuditButton({
  hotelId,
  disabled,
}: {
  hotelId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  const runAudit = async () => {
    if (disabled) return;
    setRunning(true);
    try {
      const response = await fetch("/api/website-audits/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to run website audit.");
        return;
      }
      toast.success("Website audit completed.");
      router.refresh();
    } catch {
      toast.error("Failed to run website audit.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled || running} onClick={runAudit}>
      {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {running ? "Running..." : "Run website audit"}
    </Button>
  );
}
