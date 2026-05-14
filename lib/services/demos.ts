import { prisma } from "@/lib/prisma";
import { demoCreateSchema, demoUpdateSchema } from "@/lib/validations/demo";

export async function listDemoSessions() {
  return prisma.demoSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { hotel: { select: { id: true, name: true } }, report: { select: { id: true, name: true } }, uploadBatch: { select: { id: true, fileName: true } } },
  });
}

export async function getDemoSession(id: string) {
  return prisma.demoSession.findUnique({
    where: { id },
    include: { hotel: { select: { id: true, name: true } }, report: { select: { id: true, name: true } }, uploadBatch: { select: { id: true, fileName: true } } },
  });
}

export async function createDemoSession(input: unknown, actorId: string) {
  const parsed = demoCreateSchema.parse(input);
  return prisma.demoSession.create({
    data: {
      hotelId: parsed.hotelId,
      hotelName: parsed.hotelName,
      hotelOwnerName: parsed.hotelOwnerName || null,
      scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : null,
      outcome: parsed.outcome ?? "PENDING",
      conductedBy: parsed.conductedBy || null,
      demoDate: parsed.demoDate ? new Date(parsed.demoDate) : null,
      ownerFeedback: parsed.ownerFeedback || null,
      additionalNotes: parsed.additionalNotes || null,
      uploadBatchId: parsed.uploadBatchId || null,
      reportId: parsed.reportId || null,
      createdById: actorId,
      updatedById: actorId,
    },
  });
}

export async function updateDemoSession(input: unknown, actorId: string) {
  const parsed = demoUpdateSchema.parse(input);
  return prisma.demoSession.update({
    where: { id: parsed.id },
    data: {
      hotelId: parsed.hotelId,
      hotelName: parsed.hotelName,
      hotelOwnerName: parsed.hotelOwnerName || null,
      scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : null,
      outcome: parsed.outcome ?? "PENDING",
      conductedBy: parsed.conductedBy || null,
      demoDate: parsed.demoDate ? new Date(parsed.demoDate) : null,
      ownerFeedback: parsed.ownerFeedback || null,
      additionalNotes: parsed.additionalNotes || null,
      uploadBatchId: parsed.uploadBatchId || null,
      reportId: parsed.reportId || null,
      updatedById: actorId,
    },
  });
}

export async function markDemoConductedFromReport(input: { reportId: string; hotelId: string }, actorName: string, actorId: string) {
  const existing = await prisma.demoSession.findFirst({
    where: { reportId: input.reportId, hotelId: input.hotelId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return prisma.demoSession.update({
      where: { id: existing.id },
      data: {
        outcome: "COMPLETED",
        conductedBy: actorName,
        demoDate: new Date(),
        updatedById: actorId,
      },
    });
  }

  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: input.hotelId }, select: { id: true, name: true } });
  return prisma.demoSession.create({
    data: {
      hotelId: hotel.id,
      reportId: input.reportId,
      hotelName: hotel.name,
      hotelOwnerName: null,
      outcome: "COMPLETED",
      conductedBy: actorName,
      demoDate: new Date(),
      createdById: actorId,
      updatedById: actorId,
    },
  });
}
