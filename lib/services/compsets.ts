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
    expediaUrl?: string;
    subjectHotelId: string;
    compHotels: Array<{ hotelId: string; expediaLink?: string }>;
  },
  actorId: string,
) {
  const parsed = compsetSchema.parse(input);

  const created = await prisma.compSet.create({
    data: {
      name: parsed.name,
      expediaUrl: parsed.expediaUrl || null,
      subjectHotelId: parsed.subjectHotelId,
      version: 1,
      createdById: actorId,
      updatedById: actorId,
      members: {
        create: [
          {
            hotelId: parsed.subjectHotelId,
            roleType: HotelRoleType.SUBJECT,
            displayOrder: 0,
          },
          ...parsed.compHotels.map(({ hotelId }, index) => ({
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

  // Update expediaUrl for comp hotels if a link was provided
  const hotelsToUpdate = parsed.compHotels.filter((c) => c.expediaLink?.trim());
  if (hotelsToUpdate.length > 0) {
    await Promise.all(
      hotelsToUpdate.map((c) =>
        prisma.hotel.update({
          where: { id: c.hotelId },
          data: {
            expediaUrl: c.expediaLink,
            updatedById: actorId,
          },
        }),
      ),
    );
  }

  await logActivity({

    actorId,
    entityType: "CompSet",
    entityId: created.id,
    action: "CREATED",
    message: `Created compset ${created.name}`,
  });

  return created;
}
