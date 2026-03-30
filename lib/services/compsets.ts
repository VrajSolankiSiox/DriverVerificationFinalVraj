import { HotelRoleType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { compsetSchema } from "@/lib/validations/compset";
import { logActivity } from "@/lib/activity-log";

export async function listCompSets() {
  return prisma.compSet.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      subjectHotel: true,
      members: {
        include: { hotel: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

export async function getCompSet(id: string) {
  return prisma.compSet.findUnique({
    where: { id },
    include: {
      subjectHotel: true,
      members: {
        include: { hotel: true },
        orderBy: { displayOrder: "asc" },
      },
      reports: true,
      uploadBatches: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function createCompSet(
  input: {
    name: string;
    subjectHotelId: string;
    version?: number;
    notes?: string | null;
    memberHotelIds: string[];
  },
  actorId: string,
) {
  const parsed = compsetSchema.parse({
    ...input,
    version: input.version ?? 1,
  });

  const uniqueIds = [...new Set(parsed.memberHotelIds)];
  if (uniqueIds.includes(parsed.subjectHotelId)) {
    throw new Error("Subject hotel should not be duplicated in comp members.");
  }

  const created = await prisma.compSet.create({
    data: {
      name: parsed.name,
      subjectHotelId: parsed.subjectHotelId,
      version: parsed.version,
      notes: parsed.notes || null,
      createdById: actorId,
      updatedById: actorId,
      members: {
        create: [
          {
            hotelId: parsed.subjectHotelId,
            roleType: HotelRoleType.SUBJECT,
            displayOrder: 0,
          },
          ...uniqueIds.map((hotelId, index) => ({
            hotelId,
            roleType: HotelRoleType.COMP,
            displayOrder: index + 1,
          })),
        ],
      },
    },
    include: {
      members: {
        include: { hotel: true },
      },
    },
  });

  await logActivity({
    actorId,
    entityType: "CompSet",
    entityId: created.id,
    action: "CREATED",
    message: `Created compset ${created.name}`,
  });

  return created;
}
