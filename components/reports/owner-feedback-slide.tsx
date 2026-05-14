"use client";

import { useState, useTransition } from "react";
import { MessageSquare, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { savePresentationFeedback } from "@/app/(present)/reports/[id]/present/actions";

export function OwnerFeedbackSlide({
  reportId,
  demoId,
  initialFeedback,
  hotelName,
}: {
  reportId: string;
  demoId: string | null;
  initialFeedback: string | null;
  hotelName: string;
}) {
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [saved, setSaved] = useState(!!initialFeedback);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await savePresentationFeedback(reportId, demoId, feedback);
        setSaved(true);
        toast.success("Owner feedback saved!");
      } catch {
        toast.error("Failed to save feedback.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header Card */}
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Owner Feedback — {hotelName}
          </p>
          <p className="text-xs text-emerald-600">
            Record the hotel owner's reaction, objections, and next steps from this demo.
          </p>
        </div>
        {saved && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </div>
        )}
      </div>

      {/* Textarea */}
      <div className="flex flex-1 flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Feedback / Notes from the Demo
        </label>
        <textarea
          value={feedback}
          onChange={(e) => { setFeedback(e.target.value); setSaved(false); }}
          placeholder={`e.g. ${hotelName} owner was very interested in the rate positioning data. Concerned about OTA ranking on Expedia. Wants to discuss pricing strategy next week. Key objection: current contract with existing vendor expires in 3 months…`}
          rows={8}
          className="flex-1 w-full rounded-2xl border border-input bg-slate-50 px-5 py-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring resize-none transition leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {demoId
            ? "Feedback is linked to the demo session for this hotel."
            : "No linked demo session — feedback will be saved to the report."}
        </p>
        <Button
          onClick={handleSave}
          disabled={isPending || !feedback.trim()}
          className="gap-2 px-6"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving…" : "Save Feedback"}
        </Button>
      </div>
    </div>
  );
}
