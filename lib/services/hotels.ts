import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hotelSchema, type HotelInput } from "@/lib/validations/hotel";
import { logActivity } from "@/lib/activity-log";

export class HotelNameAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`A hotel named "${name}" already exists.`);
    this.name = "HotelNameAlreadyExistsError";
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function listHotels() {
  return prisma.hotel.findMany({
    where: { profileSource: "MANUAL" },
    orderBy: [{ name: "asc" }],
    include: {
      subjectCompSets: true,
      websiteSnapshots: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      reports: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getHotel(id: string) {
  return prisma.hotel.findUnique({
    where: { id },
    include: {
      subjectCompSets: {
        include: {
          members: {
            include: {
              hotel: true,
            },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
      websiteSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { pages: true },
      },
      reviewSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 10,
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function createHotel(input: HotelInput, actorId: string) {
  const parsed = hotelSchema.parse(input);
  const { otaRatings: _otaRatings, ...hotelData } = parsed;

  const existing = await prisma.hotel.findFirst({
    where: { name: parsed.name },
    select: { id: true },
  });
  if (existing) {
    throw new HotelNameAlreadyExistsError(parsed.name);
  }

  let created;
  try {
    created = await prisma.hotel.create({
      data: {
        ...hotelData,
        profileSource: "MANUAL",
        websiteUrl: hotelData.websiteUrl || null,
        bookingUrl: hotelData.bookingUrl || null,
        email: hotelData.email || null,
        starLevel: hotelData.starLevel ?? null,
        otaRatings: parsed.otaRatings ?? Prisma.JsonNull,
        createdById: actorId,
        updatedById: actorId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HotelNameAlreadyExistsError(parsed.name);
    }
    throw error;
  }

  await logActivity({
    actorId,
    entityType: "Hotel",
    entityId: created.id,
    action: "CREATED",
    message: `Created hotel ${created.name}`,
  });

  return created;
}

export async function updateHotel(id: string, input: HotelInput, actorId: string) {
  const parsed = hotelSchema.parse(input);
  const { otaRatings: _otaRatings, ...hotelData } = parsed;

  const existing = await prisma.hotel.findFirst({
    where: { name: parsed.name, NOT: { id } },
    select: { id: true },
  });
  if (existing) {
    throw new HotelNameAlreadyExistsError(parsed.name);
  }

  let updated;
  try {
    updated = await prisma.hotel.update({
      where: { id },
      data: {
        ...hotelData,
        websiteUrl: hotelData.websiteUrl || null,
        bookingUrl: hotelData.bookingUrl || null,
        email: hotelData.email || null,
        starLevel: hotelData.starLevel ?? null,
        otaRatings: parsed.otaRatings ?? Prisma.JsonNull,
        updatedById: actorId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HotelNameAlreadyExistsError(parsed.name);
    }
    throw error;
  }

  await logActivity({
    actorId,
    entityType: "Hotel",
    entityId: id,
    action: "UPDATED",
    message: `Updated hotel ${updated.name}`,
  });

  return updated;
}
