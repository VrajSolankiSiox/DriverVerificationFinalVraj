"use client";

import { useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateMyProfile } from "@/app/(app)/settings/actions";

type ActionResult = { success: true } | { error: string };

export function ProfileForm({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = (await updateMyProfile(formData)) as ActionResult | undefined;
      if (result && "error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated successfully!");
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          name="firstName"
          defaultValue={firstName}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          name="lastName"
          defaultValue={lastName}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
