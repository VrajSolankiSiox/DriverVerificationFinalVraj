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

const MANUAL_REVIEW_SCREENSHOT_MARKER = "MANUAL_RESPONSE_SCREENSHOT";
const REVIEW_SOURCE_BY_PLATFORM = {
  google: "GOOGLE",
  expedia: "EXPEDIA",
  booking: "BOOKING",
  tripadvisor: "GOOGLE",
} as const;

type ReviewScreenshotPayload = Partial<Record<keyof typeof REVIEW_SOURCE_BY_PLATFORM, string | null | undefined>>;
type ReviewPresencePayload = Partial<
  Record<
    keyof typeof REVIEW_SOURCE_BY_PLATFORM,
    "RESPONDED" | "NOT_RESPONDED" | "NO_PRESENCE" | "NO_REVIEW"
  >
>;

async function persistReviewResponseScreenshots(
  hotelId: string,
  screenshots: ReviewScreenshotPayload | undefined,
  presence: ReviewPresencePayload | undefined,
  actorId: string,
) {
  await prisma.reviewSnapshot.deleteMany({
    where: {
      hotelId,
      sentimentSummary: MANUAL_REVIEW_SCREENSHOT_MARKER,
    },
  });

  for (const [platform, source] of Object.entries(REVIEW_SOURCE_BY_PLATFORM) as Array<
    [keyof typeof REVIEW_SOURCE_BY_PLATFORM, "GOOGLE" | "EXPEDIA" | "BOOKING"]
  >) {
    const imageDataUrl = screenshots?.[platform];
    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.trim().length > 0;
    const status = presence?.[platform] ?? (hasImage ? "RESPONDED" : "NO_PRESENCE");

    await prisma.reviewSnapshot.create({
      data: {
        hotelId,
        source,
        sentimentSummary: MANUAL_REVIEW_SCREENSHOT_MARKER,
        rawJson: {
          kind: MANUAL_REVIEW_SCREENSHOT_MARKER,
          platform,
          presence: status,
          imageDataUrl: hasImage ? imageDataUrl.trim() : null,
        },
        capturedAt: new Date(),
        createdById: actorId,
        updatedById: actorId,
      },
    });
  }
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
  const {
    otaRatings: _otaRatings,
    reviewResponsePresence: _reviewResponsePresence,
    reviewResponseScreenshots: _reviewResponseScreenshots,
    reviewResponded,
    organicSearchPositions,
    salesPerson: _salesPerson,
    ...hotelData
  } = parsed;
  const baseOtaRatings = ((parsed.otaRatings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const otaRatingsWithOrganic = {
    ...baseOtaRatings,
    __organicSearchPositions: organicSearchPositions ?? {},
  };

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
        isSubject: true,
        profileSource: "MANUAL",
        websiteUrl: hotelData.websiteUrl || null,
        bookingUrl: hotelData.bookingUrl || null,
        email: hotelData.email || null,
        starLevel: typeof hotelData.starLevel === "number" ? hotelData.starLevel : null,
        reviewReplied: reviewResponded,
        otaRatings: otaRatingsWithOrganic ?? Prisma.JsonNull,
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

  await persistReviewResponseScreenshots(
    created.id,
    parsed.reviewResponseScreenshots,
    parsed.reviewResponsePresence,
    actorId,
  );

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
  const {
    otaRatings: _otaRatings,
    reviewResponsePresence: _reviewResponsePresence,
    reviewResponseScreenshots: _reviewResponseScreenshots,
    reviewResponded,
    organicSearchPositions,
    salesPerson: _salesPerson,
    ...hotelData
  } = parsed;
  const baseOtaRatings = ((parsed.otaRatings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const otaRatingsWithOrganic = {
    ...baseOtaRatings,
    __organicSearchPositions: organicSearchPositions ?? {},
  };

  const existing = await prisma.hotel.findFirst({
    where: { name: parsed.name, NOT: { id } },
    select: { id: true, profileSource: true },
  });
  if (existing) {
    if (existing.profileSource === "AUTO_COMPSET") {
      await prisma.$transaction(async (tx) => {
        const memberships = await tx.compSetMember.findMany({
          where: { hotelId: existing.id },
          select: { id: true, compSetId: true },
        });

        for (const membership of memberships) {
          const alreadyInCompSet = await tx.compSetMember.findFirst({
            where: { compSetId: membership.compSetId, hotelId: id },
            select: { id: true },
          });
          if (alreadyInCompSet) {
            await tx.compSetMember.delete({ where: { id: membership.id } });
          } else {
            await tx.compSetMember.update({
              where: { id: membership.id },
              data: { hotelId: id },
            });
          }
        }

        await tx.hotel.delete({ where: { id: existing.id } });
      });
    } else {
      throw new HotelNameAlreadyExistsError(parsed.name);
    }
  }

  let updated;
  try {
    updated = await prisma.hotel.update({
      where: { id },
      data: {
        ...hotelData,
        isSubject: true,
        websiteUrl: hotelData.websiteUrl || null,
        bookingUrl: hotelData.bookingUrl || null,
        email: hotelData.email || null,
        starLevel: typeof hotelData.starLevel === "number" ? hotelData.starLevel : null,
        reviewReplied: reviewResponded,
        otaRatings: otaRatingsWithOrganic ?? Prisma.JsonNull,
        updatedById: actorId,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new HotelNameAlreadyExistsError(parsed.name);
    }
    throw error;
  }

  await persistReviewResponseScreenshots(
    id,
    parsed.reviewResponseScreenshots,
    parsed.reviewResponsePresence,
    actorId,
  );

  await logActivity({
    actorId,
    entityType: "Hotel",
    entityId: id,
    action: "UPDATED",
    message: `Updated hotel ${updated.name}`,
  });

  return updated;
}
