"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { updateMyProfileActionState, type ProfileUpdateState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  firstName: string;
  lastName: string;
  email: string;
};

const initialState: ProfileUpdateState | null = null;

export function ProfileForm({ firstName, lastName, email }: ProfileFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateMyProfileActionState,
    initialState,
  );

  useEffect(() => {
    if (state && "error" in state) {
      toast.error(state.error);
    } else if (state && "success" in state) {
      toast.success("Profile updated successfully.");
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input id="firstName" name="firstName" defaultValue={firstName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input id="lastName" name="lastName" defaultValue={lastName} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly disabled />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
