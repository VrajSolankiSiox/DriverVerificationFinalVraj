"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { requireUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export type ProfileUpdateState = { success: true } | { error: string };

export async function updateMyProfile(
  formData: FormData,
): Promise<ProfileUpdateState> {
  try {
    const user = await requireUser();

    const firstName = clean(formData.get("firstName"));
    const lastName = clean(formData.get("lastName"));

    if (!firstName) {
      return { error: "First name is required." };
    }

    const fullName = `${firstName} ${lastName}`.trim();

    await prisma.user.update({
      where: { id: user.id },
      data: { name: fullName },
    });

    revalidatePath("/", "layout");
    return { success: true as const };
  } catch (e: any) {
    return { error: String(e?.message || "Failed to update profile.") };
  }
}

export async function updateMyProfileActionState(
  _prevState: ProfileUpdateState | null,
  formData: FormData,
): Promise<ProfileUpdateState> {
  return updateMyProfile(formData);
}

export async function createUserAsAdmin(formData: FormData) {
  await requireRole("ADMIN");

  const firstName = clean(formData.get("firstName"));
  const lastName = clean(formData.get("lastName"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  if (!firstName) {
    throw new Error("First name is required.");
  }
  if (!email) {
    throw new Error("Email is required.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`.trim(),
      email,
      passwordHash,
      role: "USER",
    },
  });

  revalidatePath("/settings");
}

export async function archiveUserAsAdmin(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const userId = clean(formData.get("userId"));

  if (!userId) {
    throw new Error("User is required.");
  }
  if (userId === admin.id) {
    throw new Error("You cannot archive your own account.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/settings");
}

export async function restoreUserAsAdmin(formData: FormData) {
  await requireRole("ADMIN");
  const userId = clean(formData.get("userId"));

  if (!userId) {
    throw new Error("User is required.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { archivedAt: null },
  });

  revalidatePath("/settings");
}
