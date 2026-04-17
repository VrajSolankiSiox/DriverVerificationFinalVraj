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
    compHotels: Array<{ hotelName: string; expediaLink?: string }>;
  },
  actorId: string,
) {
  const parsed = compsetSchema.parse(input);

  const resolvedCompHotels: Array<{ hotelId: string }> = [];

  for (const comp of parsed.compHotels) {
    let dbHotel = await prisma.hotel.findFirst({
      where: { name: comp.hotelName },
    });

    if (!dbHotel) {
      dbHotel = await prisma.hotel.create({
        data: {
          name: comp.hotelName,
          addressLine1: "Unknown",
          city: "Unknown",
          country: "Unknown",
          expediaUrl: comp.expediaLink || null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    } else if (comp.expediaLink?.trim() && comp.expediaLink !== dbHotel.expediaUrl) {
      dbHotel = await prisma.hotel.update({
        where: { id: dbHotel.id },
        data: { expediaUrl: comp.expediaLink, updatedById: actorId },
      });
    }

    resolvedCompHotels.push({ hotelId: dbHotel.id });
  }

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
          ...resolvedCompHotels.map(({ hotelId }, index) => ({
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
