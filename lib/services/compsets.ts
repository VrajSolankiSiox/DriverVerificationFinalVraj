import { HotelRoleType } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { compsetSchema } from "@/lib/validations/compset";
import { logActivity } from "@/lib/activity-log";
import { runWebsiteAudit } from "@/lib/services/website-audit";

type CompSetHotelInputRow = {
  hotelName: string;
  starRating: number | "X" | "x";
  roomCount: number;
  ratings: {
    google: string;
    expedia: string;
    booking: string;
    agoda: string;
    priceline: string;
    tripadvisor: string;
  };
  organicSearchPositions: {
    expedia: string;
    bookingCom: string;
    priceline: string;
    google: string;
  };
};

type CompSetUpsertInput = {
  name: string;
  subjectHotelId: string;
  compHotels: CompSetHotelInputRow[];
};

const ratingPattern = /^\s*(?:10(?:\.0)?|[0-9](?:\.[0-9])?)\s*\(\s*([0-9]+)\s*\)\s*$/;

type ParsedRatingWithCount = {
  value: string;
  score: number;
  reviewCount: number;
};

function parseRatingWithCount(input: string): ParsedRatingWithCount | null {
  const trimmed = input.trim();
  if (trimmed.toUpperCase() === "X") return null;
  const match = trimmed.match(ratingPattern);
  if (!match) return null;
  const score = Number(trimmed.split("(")[0].trim());
  const reviewCount = Number(match[1]);
  if (!Number.isFinite(score) || !Number.isInteger(reviewCount)) return null;
  return {
    value: trimmed,
    score,
    reviewCount,
  };
}

function parseOrganicPosition(input: string | number | null | undefined) {
  const text = String(input ?? "").trim();
  if (!text || text.toUpperCase() === "X") return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

type CompMemberMetadata = {
  starRating: number | null;
  roomCount: number | null;
  ratings: {
    google?: ParsedRatingWithCount;
    expedia?: ParsedRatingWithCount;
    booking?: ParsedRatingWithCount;
    agoda?: ParsedRatingWithCount;
    priceline?: ParsedRatingWithCount;
    tripadvisor?: ParsedRatingWithCount;
  };
  organicSearchPositions: {
    expedia: number | null;
    bookingCom: number | null;
    priceline: number | null;
    google: number | null;
  };
  otaRatings: Record<string, number>;
};

function createEmptyCompMemberMetadata(): CompMemberMetadata {
  return {
    starRating: null,
    roomCount: null,
    ratings: {},
    organicSearchPositions: {
      expedia: null,
      bookingCom: null,
      priceline: null,
      google: null,
    },
    otaRatings: {},
  };
}

function buildCompMemberMetadata(input: {
  starRating?: number | "X" | "x";
  roomCount?: number;
  ratings?: CompSetHotelInputRow["ratings"];
  organicSearchPositions?: CompSetHotelInputRow["organicSearchPositions"];
}): CompMemberMetadata {
  const ratings = {
    google: parseRatingWithCount(input.ratings?.google ?? ""),
    expedia: parseRatingWithCount(input.ratings?.expedia ?? ""),
    booking: parseRatingWithCount(input.ratings?.booking ?? ""),
    agoda: parseRatingWithCount(input.ratings?.agoda ?? ""),
    priceline: parseRatingWithCount(input.ratings?.priceline ?? ""),
    tripadvisor: parseRatingWithCount(input.ratings?.tripadvisor ?? ""),
  };

  return {
    starRating: Number.isFinite(Number(input.starRating)) ? Number(input.starRating) : null,
    roomCount: Number.isFinite(Number(input.roomCount)) ? Number(input.roomCount) : null,
    ratings: {
      ...(ratings.google ? { google: ratings.google } : {}),
      ...(ratings.expedia ? { expedia: ratings.expedia } : {}),
      ...(ratings.booking ? { booking: ratings.booking } : {}),
      ...(ratings.agoda ? { agoda: ratings.agoda } : {}),
      ...(ratings.priceline ? { priceline: ratings.priceline } : {}),
      ...(ratings.tripadvisor ? { tripadvisor: ratings.tripadvisor } : {}),
    },
    organicSearchPositions: {
      expedia: parseOrganicPosition(input.organicSearchPositions?.expedia),
      bookingCom: parseOrganicPosition(input.organicSearchPositions?.bookingCom),
      priceline: parseOrganicPosition(input.organicSearchPositions?.priceline),
      google: parseOrganicPosition(input.organicSearchPositions?.google),
    },
    otaRatings: {
      ...(ratings.google ? { Google: ratings.google.score } : {}),
      ...(ratings.expedia ? { Expedia: ratings.expedia.score } : {}),
      ...(ratings.booking ? { Booking: ratings.booking.score } : {}),
      ...(ratings.agoda ? { Agoda: ratings.agoda.score } : {}),
      ...(ratings.priceline ? { Priceline: ratings.priceline.score } : {}),
      ...(ratings.tripadvisor ? { TripAdvisor: ratings.tripadvisor.score } : {}),
    },
  };
}

async function resolveCompHotels(
  compHotels: CompSetHotelInputRow[],
  subjectHotelName: string,
  actorId: string,
) {
  const resolvedCompHotels: Array<{ hotelId: string; metadata: CompMemberMetadata }> = [];
  const seenHotelIds = new Set<string>();
  const seenNames = new Set<string>();
  const normalizedSubject = subjectHotelName.trim().toLowerCase();

  for (const comp of compHotels) {
    const normalizedCompName = comp.hotelName.trim().toLowerCase();
    if (!normalizedCompName || normalizedCompName === normalizedSubject || seenNames.has(normalizedCompName)) {
      continue;
    }

    let dbHotel = await prisma.hotel.findFirst({
      where: {
        name: {
          equals: comp.hotelName.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!dbHotel) {
      dbHotel = await prisma.hotel.create({
        data: {
          name: comp.hotelName.trim(),
          profileSource: "AUTO_COMPSET",
          addressLine1: "Unknown",
          city: "Unknown",
          country: "Unknown",
          roomCount: comp.roomCount,
          starLevel: typeof comp.starRating === "number" ? comp.starRating : null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    } else if (
      dbHotel.roomCount !== comp.roomCount ||
      (typeof comp.starRating === "number" && Number(dbHotel.starLevel ?? 0) !== Number(comp.starRating)) ||
      (typeof comp.starRating !== "number" && dbHotel.starLevel !== null)
    ) {
      dbHotel = await prisma.hotel.update({
        where: { id: dbHotel.id },
        data: {
          roomCount: comp.roomCount,
          starLevel: typeof comp.starRating === "number" ? comp.starRating : null,
          updatedById: actorId,
        },
      });
    }

    if (seenHotelIds.has(dbHotel.id)) {
      continue;
    }

    const metadata = buildCompMemberMetadata({
      starRating: comp.starRating,
      roomCount: comp.roomCount,
      ratings: comp.ratings,
      organicSearchPositions: comp.organicSearchPositions,
    });

    resolvedCompHotels.push({ hotelId: dbHotel.id, metadata });
    seenHotelIds.add(dbHotel.id);
    seenNames.add(normalizedCompName);
  }

  return resolvedCompHotels;
}

function serializeCompMemberMetadata(metadata?: CompMemberMetadata) {
  if (!metadata) return null;
  const hasAnyData =
    metadata.starRating !== null ||
    metadata.roomCount !== null ||
    Object.keys(metadata.ratings).length > 0 ||
    Object.values(metadata.organicSearchPositions).some((value) => value !== null) ||
    Object.keys(metadata.otaRatings).length > 0;

  if (!hasAnyData) return null;
  return JSON.stringify(metadata);
}

function mergeCompMemberMetadata(
  nextMetadata: CompMemberMetadata,
  prevMetadata: CompMemberMetadata,
): CompMemberMetadata {
  const mergedRatings = {
    ...prevMetadata.ratings,
    ...nextMetadata.ratings,
  };
  const mergedOtaRatings = {
    ...prevMetadata.otaRatings,
    ...nextMetadata.otaRatings,
  };

  return {
    starRating:
      nextMetadata.starRating !== null ? nextMetadata.starRating : prevMetadata.starRating,
    roomCount:
      nextMetadata.roomCount !== null ? nextMetadata.roomCount : prevMetadata.roomCount,
    ratings: mergedRatings,
    organicSearchPositions: {
      expedia:
        nextMetadata.organicSearchPositions.expedia !== null
          ? nextMetadata.organicSearchPositions.expedia
          : prevMetadata.organicSearchPositions.expedia,
      bookingCom:
        nextMetadata.organicSearchPositions.bookingCom !== null
          ? nextMetadata.organicSearchPositions.bookingCom
          : prevMetadata.organicSearchPositions.bookingCom,
      priceline:
        nextMetadata.organicSearchPositions.priceline !== null
          ? nextMetadata.organicSearchPositions.priceline
          : prevMetadata.organicSearchPositions.priceline,
      google:
        nextMetadata.organicSearchPositions.google !== null
          ? nextMetadata.organicSearchPositions.google
          : prevMetadata.organicSearchPositions.google,
    },
    otaRatings: mergedOtaRatings,
  };
}

export function parseCompMemberMetadata(notes: string | null | undefined) {
  if (!notes) {
    return createEmptyCompMemberMetadata();
  }

  try {
    const parsed = JSON.parse(notes) as Partial<CompMemberMetadata> & { otaRatings?: Record<string, unknown> };
    const rawOtaRatings = parsed.otaRatings ?? {};
    const otaRatings: Record<string, number> = {};
    for (const [key, value] of Object.entries(rawOtaRatings)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        otaRatings[key] = numeric;
      }
    }

    return {
      starRating: Number.isFinite(Number(parsed.starRating)) ? Number(parsed.starRating) : null,
      roomCount: Number.isFinite(Number(parsed.roomCount)) ? Number(parsed.roomCount) : null,
      ratings: {
        ...(parsed.ratings?.google ? { google: parsed.ratings.google } : {}),
        ...(parsed.ratings?.expedia ? { expedia: parsed.ratings.expedia } : {}),
        ...(parsed.ratings?.booking ? { booking: parsed.ratings.booking } : {}),
        ...(parsed.ratings?.agoda ? { agoda: parsed.ratings.agoda } : {}),
        ...(parsed.ratings?.priceline ? { priceline: parsed.ratings.priceline } : {}),
        ...(parsed.ratings?.tripadvisor ? { tripadvisor: parsed.ratings.tripadvisor } : {}),
      },
      organicSearchPositions: {
        expedia: Number.isFinite(Number(parsed.organicSearchPositions?.expedia))
          ? Number(parsed.organicSearchPositions?.expedia)
          : null,
        bookingCom: Number.isFinite(Number(parsed.organicSearchPositions?.bookingCom))
          ? Number(parsed.organicSearchPositions?.bookingCom)
          : null,
        priceline: Number.isFinite(Number(parsed.organicSearchPositions?.priceline))
          ? Number(parsed.organicSearchPositions?.priceline)
          : null,
        google: Number.isFinite(Number(parsed.organicSearchPositions?.google))
          ? Number(parsed.organicSearchPositions?.google)
          : null,
      },
      otaRatings,
    };
  } catch {
    return createEmptyCompMemberMetadata();
  }
}

export function parseCompMemberOtaRatings(notes: string | null | undefined) {
  return parseCompMemberMetadata(notes).otaRatings;
}

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
        include: {
          hotel: {
            include: {
              websiteSnapshots: {
                where: { status: "COMPLETE" },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
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
  input: CompSetUpsertInput,
  actorId: string,
) {
  const parsed = compsetSchema.parse(input);
  const subjectHotel = await prisma.hotel.findUniqueOrThrow({
    where: { id: parsed.subjectHotelId },
    select: { id: true, name: true },
  });

  const resolvedCompHotels = await resolveCompHotels(parsed.compHotels, subjectHotel.name, actorId);

  if (resolvedCompHotels.length === 0) {
    throw new Error("At least one competitor different from the main property is required.");
  }

  await prisma.hotel.update({
    where: { id: parsed.subjectHotelId },
    data: {
      isSubject: true,
      updatedById: actorId,
    },
  });

  const created = await prisma.compSet.create({
    data: {
      name: parsed.name,
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
          ...resolvedCompHotels.map(({ hotelId, metadata }, index) => ({
            hotelId,
            roleType: HotelRoleType.COMP,
            displayOrder: index + 1,
            notes: serializeCompMemberMetadata(metadata),
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

export async function updateCompSet(
  compSetId: string,
  input: CompSetUpsertInput,
  actorId: string,
) {
  const parsed = compsetSchema.parse(input);
  const existingCompSet = await prisma.compSet.findUniqueOrThrow({
    where: { id: compSetId },
    select: {
      id: true,
      name: true,
      subjectHotelId: true,
      subjectHotel: {
        select: {
          name: true,
        },
      },
      members: {
        select: {
          hotelId: true,
          notes: true,
        },
      },
    },
  });

  if (parsed.subjectHotelId !== existingCompSet.subjectHotelId) {
    throw new Error("Changing the main property is not supported when editing a compset.");
  }

  const resolvedCompHotelsRaw = await resolveCompHotels(
    parsed.compHotels,
    existingCompSet.subjectHotel.name,
    actorId,
  );
  const previousMetadataByHotelId = new Map(
    existingCompSet.members.map((member) => [
      member.hotelId,
      parseCompMemberMetadata(member.notes),
    ]),
  );
  const resolvedCompHotels = resolvedCompHotelsRaw.map((row) => {
    const prev = previousMetadataByHotelId.get(row.hotelId);
    if (!prev) return row;
    return {
      ...row,
      metadata: mergeCompMemberMetadata(row.metadata, prev),
    };
  });
  if (resolvedCompHotels.length === 0) {
    throw new Error("At least one competitor different from the main property is required.");
  }

  await prisma.hotel.update({
    where: { id: existingCompSet.subjectHotelId },
    data: {
      isSubject: true,
      updatedById: actorId,
    },
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.compSetMember.deleteMany({
      where: { compSetId },
    });

    await tx.compSetMember.createMany({
      data: [
        {
          compSetId,
          hotelId: existingCompSet.subjectHotelId,
          roleType: HotelRoleType.SUBJECT,
          displayOrder: 0,
        },
        ...resolvedCompHotels.map(({ hotelId, metadata }, index) => ({
          compSetId,
          hotelId,
          roleType: HotelRoleType.COMP,
          displayOrder: index + 1,
          notes: serializeCompMemberMetadata(metadata),
        })),
      ],
    });

    return tx.compSet.update({
      where: { id: compSetId },
      data: {
        name: parsed.name,
        version: {
          increment: 1,
        },
        updatedById: actorId,
      },
    });
  });

  await logActivity({
    actorId,
    entityType: "CompSet",
    entityId: compSetId,
    action: "UPDATED",
    message: `Updated compset ${updated.name}`,
  });

  return updated;
}

export async function addHotelsToCompSet(
  input: { compSetId: string; hotelNames: string[] },
  actorId: string,
) {
  const names = [...new Set(input.hotelNames.map((name) => name.trim()).filter(Boolean))];
  if (!names.length) {
    return { createdHotels: 0, addedMembers: 0, skipped: 0 };
  }

  const compSet = await prisma.compSet.findUniqueOrThrow({
    where: { id: input.compSetId },
    select: {
      id: true,
      name: true,
      members: {
        select: { hotelId: true, displayOrder: true, hotel: { select: { name: true } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  const existingHotelIds = new Set(compSet.members.map((m) => m.hotelId));
  const existingNamesNormalized = new Set(compSet.members.map((m) => m.hotel.name.trim().toLowerCase()));
  const maxOrder = compSet.members.reduce((max, m) => Math.max(max, m.displayOrder), 0);

  let createdHotels = 0;
  let addedMembers = 0;
  let skipped = 0;
  let nextOrder = maxOrder + 1;

  for (const rawName of names) {
    const normalized = rawName.trim().toLowerCase();
    if (existingNamesNormalized.has(normalized)) {
      skipped += 1;
      continue;
    }

    let hotel = await prisma.hotel.findFirst({
      where: {
        name: {
          equals: rawName.trim(),
          mode: "insensitive",
        },
      },
      select: { id: true, name: true },
    });

    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: rawName.trim(),
          profileSource: "AUTO_COMPSET",
          addressLine1: "Unknown",
          city: "Unknown",
          country: "Unknown",
          createdById: actorId,
          updatedById: actorId,
        },
        select: { id: true, name: true },
      });
      createdHotels += 1;
    }

    if (existingHotelIds.has(hotel.id)) {
      skipped += 1;
      continue;
    }

    await prisma.compSetMember.create({
      data: {
        compSetId: compSet.id,
        hotelId: hotel.id,
        roleType: HotelRoleType.COMP,
        displayOrder: nextOrder,
      },
    });

    existingHotelIds.add(hotel.id);
    existingNamesNormalized.add(hotel.name.trim().toLowerCase());
    addedMembers += 1;
    nextOrder += 1;
  }

  if (addedMembers > 0) {
    await prisma.compSet.update({
      where: { id: compSet.id },
      data: { updatedById: actorId },
    });

    await logActivity({
      actorId,
      entityType: "CompSet",
      entityId: compSet.id,
      action: "UPDATED",
      message: `Added ${addedMembers} hotels to compset ${compSet.name}`,
      metadata: { createdHotels, addedMembers, skipped },
    });
  }

  return { createdHotels, addedMembers, skipped };
}

export async function runDraftCompetitorWebsiteAudits(
  input: {
    compHotels: Array<{ hotelName: string; websiteUrl?: string; bookingUrl?: string; expediaLink?: string }>;
  },
  actorId: string,
) {
  const draftAuditRowSchema = z.object({
    hotelName: z.string().min(1),
    websiteUrl: z.string().optional().or(z.literal("")),
    bookingUrl: z.string().optional().or(z.literal("")),
    expediaLink: z.string().optional().or(z.literal("")),
  });
  const rows = input.compHotels.map((row) => draftAuditRowSchema.parse(row));
  const deduped = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    const normalizedName = row.hotelName.trim().toLowerCase();
    if (!normalizedName) continue;
    if (!deduped.has(normalizedName)) {
      deduped.set(normalizedName, row);
    }
  }

  let attempted = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedMissingWebsite = 0;
  const failures: Array<{ hotelName: string; error: string }> = [];
  const auditResults: Array<{
    hotelName: string;
    status: "SUCCESS" | "FAILED" | "SKIPPED_NO_WEBSITE";
    websiteScore: number | null;
    seoScore: number | null;
    error?: string;
  }> = [];

  for (const row of deduped.values()) {
    const hotelName = row.hotelName.trim();
    const websiteUrl = row.websiteUrl?.trim() || "";
    const bookingUrl = row.bookingUrl?.trim() || "";
    const expediaLink = row.expediaLink?.trim() || "";

    if (!websiteUrl) {
      skippedMissingWebsite += 1;
      auditResults.push({
        hotelName,
        status: "SKIPPED_NO_WEBSITE",
        websiteScore: null,
        seoScore: null,
      });
      continue;
    }

    attempted += 1;

    let hotel = await prisma.hotel.findFirst({
      where: {
        name: {
          equals: hotelName,
          mode: "insensitive",
        },
      },
    });

    if (!hotel) {
      hotel = await prisma.hotel.create({
        data: {
          name: hotelName,
          profileSource: "AUTO_COMPSET",
          addressLine1: "Unknown",
          city: "Unknown",
          country: "Unknown",
          websiteUrl,
          bookingUrl: bookingUrl || null,
          expediaUrl: expediaLink || null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    } else {
      hotel = await prisma.hotel.update({
        where: { id: hotel.id },
        data: {
          websiteUrl,
          bookingUrl: bookingUrl || hotel.bookingUrl,
          expediaUrl: expediaLink || hotel.expediaUrl,
          updatedById: actorId,
        },
      });
    }

    try {
      const snapshot = await runWebsiteAudit(hotel.id, actorId);
      successCount += 1;
      auditResults.push({
        hotelName,
        status: "SUCCESS",
        websiteScore: snapshot.scoreTotal ?? null,
        seoScore: snapshot.seoScoreTotal ?? null,
      });
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "Unknown audit error";
      failures.push({
        hotelName,
        error: message,
      });
      auditResults.push({
        hotelName,
        status: "FAILED",
        websiteScore: null,
        seoScore: null,
        error: message,
      });
    }
  }

  return {
    attempted,
    successCount,
    failedCount,
    skippedMissingWebsite,
    failures,
    auditResults,
  };
}
