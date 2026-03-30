"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hotelSchema, type HotelInput } from "@/lib/validations/hotel";

export function HotelForm({ defaultValues, hotelId }: { defaultValues?: Partial<HotelInput>; hotelId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<HotelInput>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      brand: defaultValues?.brand ?? "",
      addressLine1: defaultValues?.addressLine1 ?? "",
      addressLine2: defaultValues?.addressLine2 ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      country: defaultValues?.country ?? "United States",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      bookingUrl: defaultValues?.bookingUrl ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      roomCount: defaultValues?.roomCount ?? undefined,
      starLevel: defaultValues?.starLevel ?? undefined,
      ownershipNotes: defaultValues?.ownershipNotes ?? "",
      managementNotes: defaultValues?.managementNotes ?? "",
    },
  });

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const response = await fetch(hotelId ? `/api/hotels/${hotelId}` : "/api/hotels", {
          method: hotelId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Failed to save hotel.");
          return;
        }
        router.push(`/hotels/${result.id}`);
        router.refresh();
      })}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Property name</Label>
        <Input id="name" {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand">Brand / flag</Label>
        <Input id="brand" {...form.register("brand")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="roomCount">Room count</Label>
        <Input id="roomCount" type="number" {...form.register("roomCount", { valueAsNumber: true })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="addressLine1">Address</Label>
        <Input id="addressLine1" {...form.register("addressLine1")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" {...form.register("city")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input id="state" {...form.register("state")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" {...form.register("country")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="starLevel">Star level</Label>
        <Input id="starLevel" type="number" step="0.1" {...form.register("starLevel", { valueAsNumber: true })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input id="websiteUrl" type="url" {...form.register("websiteUrl")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="bookingUrl">Booking URL</Label>
        <Input id="bookingUrl" type="url" {...form.register("bookingUrl")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" {...form.register("phone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...form.register("email")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="ownershipNotes">Ownership notes</Label>
        <Textarea id="ownershipNotes" {...form.register("ownershipNotes")} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="managementNotes">Management notes</Label>
        <Textarea id="managementNotes" {...form.register("managementNotes")} />
      </div>
      {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit">{hotelId ? "Update hotel" : "Create hotel"}</Button>
      </div>
    </form>
  );
}
