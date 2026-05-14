"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateDemoOutcome, updateDemoSalesPerson } from "./actions";
import { toast } from "react-toastify";

type DemoRow = {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelOwnerName: string | null;
  scheduledDate: string | null;
  outcome: string;
  conductedBy: string | null;
  demoDate: string | null;
  ownerFeedback: string | null;
  additionalNotes: string | null;
  reportId: string | null;
  uploadBatchId: string | null;
};

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

// ─── Completion Modal ────────────────────────────────────────────────────────
function CompletionModal({
  demoId,
  hotelName,
  onClose,
  onSaved,
}: {
  demoId: string;
  hotelName: string;
  onClose: () => void;
  onSaved: (feedback: string) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDemoFeedback(demoId, feedback);
      onSaved(feedback);
      toast.success("Demo marked as completed!");
      onClose();
    } catch {
      toast.error("Failed to save feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {step === 1 ? (
          /* ── Step 1: Demo Complete ── */
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Demo Complete!</h2>
            <p className="text-slate-500 text-sm">
              Great job completing the demo for <span className="font-semibold text-slate-700">{hotelName}</span>.
              <br />Would you like to record the owner's feedback?
            </p>
            <div className="mt-2 flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { onSaved(""); onClose(); updateDemoFeedback(demoId, ""); }}
              >
                Skip Feedback
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Add Feedback
              </Button>
            </div>
          </div>
        ) : (
          /* ── Step 2: Owner Feedback ── */
          <div className="flex flex-col gap-4 px-8 py-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Owner Feedback</h2>
                <p className="text-xs text-slate-500">{hotelName}</p>
              </div>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did the owner say? Any objections, interest level, next steps…"
              rows={5}
              className="w-full rounded-xl border border-input bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : "Save Feedback"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sales Autocomplete Input ────────────────────────────────────────────────
function SalesInput({ row, suggestions, onSave }: {
  row: DemoRow;
  suggestions: string[];
  onSave: (id: string, value: string) => void;
}) {
  const [value, setValue] = useState(row.conductedBy ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );

  const handleBlur = async (e: React.FocusEvent) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setShowSuggestions(false);
    if (value !== (row.conductedBy ?? "")) {
      setSaving(true);
      try { await onSave(row.id, value); } finally { setSaving(false); }
    }
  };

  const handleSelect = async (name: string) => {
    setValue(name);
    setShowSuggestions(false);
    setSaving(true);
    try { await onSave(row.id, name); } finally { setSaving(false); }
  };

  return (
    <div ref={containerRef} className="relative w-full" onBlur={handleBlur}>
      <input
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Assign sales rep…"
        className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {saving && <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">Saving…</span>}
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          {filtered.map((s) => (
            <li
              key={s}
              tabIndex={0}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DemoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const salesSuggestions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.conductedBy).filter(Boolean) as string[])),
    [rows]
  );

  const load = async () => {
    const res = await fetch("/api/demos");
    const json = await res.json();
    if (res.ok) {
      setRows(json.map((r: any) => ({
        ...r,
        outcome: r.outcome ?? (r.conducted ? "COMPLETED" : "PENDING")
      })));
    }
  };

  const handleOutcomeChange = async (id: string, newOutcome: string) => {
    try {
      await updateDemoOutcome(id, newOutcome as any);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, outcome: newOutcome } : r)));
      toast.success("Outcome updated");
    } catch {
      toast.error("Failed to update outcome");
    }
  };

  const handleSalesPersonSave = async (id: string, salesPerson: string) => {
    try {
      await updateDemoSalesPerson(id, salesPerson);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, conductedBy: salesPerson || null } : r)));
      toast.success("Sales person saved");
    } catch {
      toast.error("Failed to save sales person");
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>Demo Sessions</CardTitle>
          <Button asChild>
            <Link href="/demo/new">Add Demo</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Hotel Name</TableHead>
                <TableHead>Hotel Owner</TableHead>
                <TableHead className="w-48">Sales</TableHead>
                <TableHead className="w-44">Outcome</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{row.hotelName}</TableCell>
                  <TableCell>{row.hotelOwnerName || "–"}</TableCell>
                  <TableCell>
                    <SalesInput row={row} suggestions={salesSuggestions} onSave={handleSalesPersonSave} />
                  </TableCell>
                  <TableCell>
                    <select
                      value={row.outcome}
                      onChange={(e) => handleOutcomeChange(row.id, e.target.value)}
                      className={`h-8 w-full rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                        row.outcome === "COMPLETED"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <option value="PENDING">Not Completed</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(row.id)}>
                      View
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/demo/${row.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRow ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Demo Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-4 text-sm">
            <p><strong>Hotel:</strong> {selectedRow.hotelName}</p>
            <p><strong>Hotel Owner:</strong> {selectedRow.hotelOwnerName || "–"}</p>
            <p>
              <strong>Outcome:</strong>{" "}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                selectedRow.outcome === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {selectedRow.outcome === "COMPLETED" ? "Completed" : "Not Completed"}
              </span>
            </p>
            <p><strong>Sales Person:</strong> {selectedRow.conductedBy || "–"}</p>
            <p><strong>Date Of Demo:</strong> {toInputDate(selectedRow.demoDate) || "–"}</p>
            <p><strong>Scheduled Date:</strong> {toInputDate(selectedRow.scheduledDate) || "–"}</p>
            {selectedRow.ownerFeedback && (
              <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">Owner Feedback</p>
                <p className="text-sm text-slate-700">{selectedRow.ownerFeedback}</p>
              </div>
            )}
            {!selectedRow.ownerFeedback && <p><strong>Owner Feedback:</strong> –</p>}
            <p><strong>Additional Notes:</strong> {selectedRow.additionalNotes || "–"}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
