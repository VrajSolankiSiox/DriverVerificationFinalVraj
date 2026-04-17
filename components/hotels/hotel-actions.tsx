"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HotelActions({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const [runningWeb, setRunningWeb] = useState(false);
  const [runningReview, setRunningReview] = useState(false);

  const runWebAudit = async () => {
    setRunningWeb(true);
    try {
      const res = await fetch("/api/website-audits/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to run website audit.");
      } else {
        toast.success("Website audit completed!");
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to run website audit.");
    } finally {
      setRunningWeb(false);
    }
  };

  const runReviewSnapshot = async () => {
    setRunningReview(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to run review snapshot.");
      } else {
        toast.success("Review snapshot completed!");
        router.refresh();
      }
    } catch (e) {
      toast.error("Failed to run review snapshot.");
    } finally {
      setRunningReview(false);
    }
  };

  return (
    <>
      <Button onClick={runWebAudit} disabled={runningWeb}>
        {runningWeb && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {runningWeb ? "Running..." : "Run website audit"}
      </Button>
      <Button variant="secondary" onClick={runReviewSnapshot} disabled={runningReview}>
        {runningReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {runningReview ? "Running..." : "Run review snapshot"}
      </Button>
    </>
  );
}
