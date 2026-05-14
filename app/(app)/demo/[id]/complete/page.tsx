"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, MessageSquare, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateDemoFeedback } from "../../actions";
import { toast } from "react-toastify";

export default function DemoCompletePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const demoId = params.id;

  const handleSaveFeedback = async () => {
    setSaving(true);
    try {
      await updateDemoFeedback(demoId, feedback);
      toast.success("Feedback saved successfully!");
      router.push("/demo");
    } catch {
      toast.error("Failed to save feedback.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updateDemoFeedback(demoId, "");
      router.push("/demo");
    } catch {
      toast.error("Failed to update demo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-lg">
        {step === 1 ? (
          /* ── Step 1: Demo Complete Screen ── */
          <div className="rounded-3xl border border-emerald-100 bg-white shadow-xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />

            <div className="flex flex-col items-center gap-6 px-10 py-12 text-center">
              {/* Icon */}
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-800">Demo Completed!</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  The demo session has been marked as completed. <br />
                  Would you like to record the hotel owner's feedback?
                </p>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-8 rounded-full bg-emerald-500" />
                <div className="h-2 w-8 rounded-full bg-slate-200" />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  onClick={() => setStep(2)}
                >
                  Next — Add Feedback
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Skip — I'll do it later
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Step 2: Owner Feedback Screen ── */
          <div className="rounded-3xl border border-blue-100 bg-white shadow-xl overflow-hidden">
            {/* Top accent bar */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-400 to-indigo-500" />

            <div className="flex flex-col gap-6 px-10 py-12">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Owner Feedback</h1>
                  <p className="text-slate-500 text-sm">Record what the hotel owner said during the demo</p>
                </div>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded-full bg-slate-200" />
                <div className="h-2 w-8 rounded-full bg-blue-500" />
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Feedback / Notes
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. Owner was interested but wants to compare pricing. Follow up next week. Mentioned they're unhappy with current OTA rankings…"
                  rows={6}
                  autoFocus
                  className="w-full rounded-xl border border-input bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring resize-none transition"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1 h-11 rounded-xl font-semibold"
                  disabled={saving}
                  onClick={handleSaveFeedback}
                >
                  {saving ? "Saving…" : "Save Feedback"}
                </Button>
              </div>

              <button
                onClick={handleSkip}
                disabled={saving}
                className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
              >
                Skip feedback and go back to demos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
