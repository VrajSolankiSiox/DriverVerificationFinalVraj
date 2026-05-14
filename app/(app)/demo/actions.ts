"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateDemoOutcome(demoId: string, outcome: "PENDING" | "NO_SHOW" | "COMPLETED" | "CANCELLED" | "RESCHEDULED") {
  await prisma.demoSession.update({
    where: { id: demoId },
    data: { outcome }
  });
  revalidatePath("/demo");
  revalidatePath("/dashboard");
}

export async function updateDemoSalesPerson(demoId: string, salesPerson: string) {
  await prisma.demoSession.update({
    where: { id: demoId },
    data: { conductedBy: salesPerson || null }
  });
  revalidatePath("/demo");
}

export async function updateDemoFeedback(demoId: string, feedback: string) {
  await prisma.demoSession.update({
    where: { id: demoId },
    data: {
      outcome: "COMPLETED",
      ownerFeedback: feedback || null,
      demoDate: new Date(),
    }
  });
  revalidatePath("/demo");
  revalidatePath("/dashboard");
}
