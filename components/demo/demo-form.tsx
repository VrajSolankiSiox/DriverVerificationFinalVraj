"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DemoFormValues } from "@/lib/demo/form-values";

type HotelOption = { id: string; name: string; salesPerson?: string | null };

const blankForm: DemoFormValues = {
  hotelId: "",
  hotelName: "",
  hotelOwnerName: "",
  scheduledDate: "",
  outcome: "PENDING",
  conductedBy: "",
  demoDate: "",
  ownerFeedback: "",
  additionalNotes: "",
};

export function DemoForm({
  title,
  submitLabel,
  endpoint,
  method,
  initialValues,
}: {
  title: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PUT";
  initialValues?: Partial<DemoFormValues>;
}) {
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [form, setForm] = useState<DemoFormValues>({ ...blankForm, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/hotels");
      const data = await response.json();
      if (response.ok) {
        setHotels(data);
      }
    })();
  }, []);

  const onHotelChange = (hotelId: string) => {
    const hotel = hotels.find((item) => item.id === hotelId);
    setForm((prev) => ({
      ...prev,
      hotelId,
      hotelName: hotel?.name ?? prev.hotelName,
      // Auto-fill the conductedBy from hotel's salesPerson if not already set
      conductedBy: prev.conductedBy || hotel?.salesPerson || prev.conductedBy,
    }));
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        hotelId: form.hotelId,
        hotelName: form.hotelName,
        hotelOwnerName: form.hotelOwnerName || null,
        scheduledDate: form.scheduledDate || null,
        outcome: form.outcome,
        conductedBy: form.conductedBy || null,
        demoDate: form.demoDate || null,
        ownerFeedback: form.ownerFeedback || null,
        additionalNotes: form.additionalNotes || null,
      };
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to save demo record.");
        return;
      }
      router.push("/demo");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Hotel</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.hotelId}
            onChange={(event) => onHotelChange(event.target.value)}
          >
            <option value="">Select hotel</option>
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Hotel Name</Label>
          <Input value={form.hotelName} onChange={(event) => setForm((prev) => ({ ...prev, hotelName: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Hotel Owner</Label>
          <Input value={form.hotelOwnerName} onChange={(event) => setForm((prev) => ({ ...prev, hotelOwnerName: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Scheduled Date</Label>
          <Input type="date" value={form.scheduledDate} onChange={(event) => setForm((prev) => ({ ...prev, scheduledDate: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Conducted By</Label>
          <Input value={form.conductedBy} onChange={(event) => setForm((prev) => ({ ...prev, conductedBy: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Date Of Demo</Label>
          <Input type="date" value={form.demoDate} onChange={(event) => setForm((prev) => ({ ...prev, demoDate: event.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Outcome</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.outcome}
            onChange={(event) => setForm((prev) => ({ ...prev, outcome: event.target.value }))}
          >
            <option value="PENDING">Pending</option>
            <option value="NO_SHOW">No-show</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RESCHEDULED">Rescheduled</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Owner Feedback</Label>
          <Input value={form.ownerFeedback} onChange={(event) => setForm((prev) => ({ ...prev, ownerFeedback: event.target.value }))} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Additional Notes</Label>
          <Input value={form.additionalNotes} onChange={(event) => setForm((prev) => ({ ...prev, additionalNotes: event.target.value }))} />
        </div>
        {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
        <div className="flex gap-2 md:col-span-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/demo")}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
