import { HotelRoleType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { compsetHotelRowSchema, compsetSchema } from "@/lib/validations/compset";
import { logActivity } from "@/lib/activity-log";
import { runWebsiteAudit } from "@/lib/services/website-audit";

type CompSetHotelInputRow = {
  hotelName: string;
  websiteUrl?: string;
  bookingUrl?: string;
  expediaLink?: string;
  otaRatings?: Record<string, string | number>;
};

type CompSetUpsertInput = {
  name: string;
  subjectHotelId: string;
  compHotels: CompSetHotelInputRow[];
};

async function resolveCompHotels(
  compHotels: CompSetHotelInputRow[],
  subjectHotelName: string,
  actorId: string,
) {
  const resolvedCompHotels: Array<{ hotelId: string; otaRatings: Record<string, string | number> }> = [];
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
          name: comp.hotelName,
          profileSource: "AUTO_COMPSET",
          addressLine1: "Unknown",
          city: "Unknown",
          country: "Unknown",
          websiteUrl: comp.websiteUrl || null,
          bookingUrl: comp.bookingUrl || null,
          expediaUrl: comp.expediaLink || null,
          createdById: actorId,
          updatedById: actorId,
        },
      });
    } else if (
      (comp.expediaLink?.trim() && comp.expediaLink !== dbHotel.expediaUrl) ||
      (comp.websiteUrl?.trim() && comp.websiteUrl !== dbHotel.websiteUrl) ||
      (comp.bookingUrl?.trim() && comp.bookingUrl !== dbHotel.bookingUrl)
    ) {
      dbHotel = await prisma.hotel.update({
        where: { id: dbHotel.id },
        data: {
          expediaUrl: comp.expediaLink?.trim() ? comp.expediaLink : dbHotel.expediaUrl,
          websiteUrl: comp.websiteUrl?.trim() ? comp.websiteUrl : dbHotel.websiteUrl,
          bookingUrl: comp.bookingUrl?.trim() ? comp.bookingUrl : dbHotel.bookingUrl,
          updatedById: actorId,
        },
      });
    }

    if (seenHotelIds.has(dbHotel.id)) {
      continue;
    }

    const otaRatings: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(comp.otaRatings ?? {})) {
      if (value === "" || value === null || value === undefined) {
        continue;
      }
      otaRatings[key] = value;
    }

    resolvedCompHotels.push({ hotelId: dbHotel.id, otaRatings });
    seenHotelIds.add(dbHotel.id);
    seenNames.add(normalizedCompName);
  }

  return resolvedCompHotels;
}

function serializeCompMemberOtaRatings(otaRatings?: Record<string, string | number>) {
  const normalizedEntries = Object.entries(otaRatings ?? {}).filter(([, value]) => value !== "" && value !== null && value !== undefined);
  if (normalizedEntries.length === 0) {
    return null;
  }

  return JSON.stringify({
    otaRatings: Object.fromEntries(normalizedEntries),
  });
}

export function parseCompMemberOtaRatings(notes: string | null | undefined) {
  if (!notes) {
    return {};
  }

  try {
    const parsed = JSON.parse(notes) as { otaRatings?: Record<string, unknown> };
    const raw = parsed?.otaRatings;
    if (!raw || typeof raw !== "object") {
      return {};
    }

    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "number" || typeof value === "string") {
        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
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
          ...resolvedCompHotels.map(({ hotelId, otaRatings }, index) => ({
            hotelId,
            roleType: HotelRoleType.COMP,
            displayOrder: index + 1,
            notes: serializeCompMemberOtaRatings(otaRatings),
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
    },
  });

  if (parsed.subjectHotelId !== existingCompSet.subjectHotelId) {
    throw new Error("Changing the main property is not supported when editing a compset.");
  }

  const resolvedCompHotels = await resolveCompHotels(
    parsed.compHotels,
    existingCompSet.subjectHotel.name,
    actorId,
  );
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
        ...resolvedCompHotels.map(({ hotelId, otaRatings }, index) => ({
          compSetId,
          hotelId,
          roleType: HotelRoleType.COMP,
          displayOrder: index + 1,
          notes: serializeCompMemberOtaRatings(otaRatings),
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
  const rows = input.compHotels.map((row) => compsetHotelRowSchema.parse(row));
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
