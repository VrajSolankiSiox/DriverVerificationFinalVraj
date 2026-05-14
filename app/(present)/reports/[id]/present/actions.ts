"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePresentationFeedback(
  reportId: string,
  demoId: string | null,
  feedback: string
) {
  if (demoId) {
    // Save to the specific demo session
    await prisma.demoSession.update({
      where: { id: demoId },
      data: {
        ownerFeedback: feedback || null,
        outcome: "COMPLETED",
      },
    });
  } else {
    // Try to find a demo session linked to this report
    const demo = await prisma.demoSession.findFirst({
      where: { reportId },
    });
    if (demo) {
      await prisma.demoSession.update({
        where: { id: demo.id },
        data: {
          ownerFeedback: feedback || null,
          outcome: "COMPLETED",
        },
      });
    } else {
      // Find by the report's subject hotel and create/update
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: { subjectHotelId: true },
      });
      if (report) {
        const hotelDemo = await prisma.demoSession.findFirst({
          where: { hotelId: report.subjectHotelId },
          orderBy: { createdAt: "desc" },
        });
        if (hotelDemo) {
          await prisma.demoSession.update({
            where: { id: hotelDemo.id },
            data: {
              ownerFeedback: feedback || null,
              outcome: "COMPLETED",
            },
          });
        }
      }
    }
  }

  revalidatePath("/demo");
  revalidatePath(`/reports/${reportId}`);
}
