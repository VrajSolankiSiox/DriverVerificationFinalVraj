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
    hotels: Array<{
      hotelName: string;
      expediaLink?: string;
    }>;
  },
  actorId: string,
) {
  const parsed = compsetSchema.parse(input);

  // Create hotels if they don't exist, or find existing ones
  const hotelPromises = parsed.hotels.map(async (hotelData, index) => {
    let hotel = await prisma.hotel.findFirst({
      where: { name: hotelData.hotelName },
    });

    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: hotelData.hotelName,
          expediaUrl: hotelData.expediaLink || null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    }

    return {
      hotel,
      roleType: index === 0 ? HotelRoleType.SUBJECT : HotelRoleType.COMP,
      displayOrder: index,
    };
  });

  const hotelResults = await Promise.all(hotelPromises);

  // Use the first hotel as the subject
  const subjectHotel = hotelResults[0].hotel;

  const created = await prisma.compSet.create({
    data: {
      name: parsed.name,
      expediaUrl: parsed.expediaUrl || null,
      subjectHotelId: subjectHotel.id,
      version: 1,
      createdById: actorId,
      updatedById: actorId,
      members: {
        create: hotelResults.map(({ hotel, roleType, displayOrder }) => ({
          hotelId: hotel.id,
          roleType,
          displayOrder,
        })),
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
