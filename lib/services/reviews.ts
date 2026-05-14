import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logActivity } from "@/lib/activity-log";
import { scrapeGoogle } from "@/lib/reviews/scrapers/google";
import type { ReviewSource } from "@/lib/reviews/types";

const scrapers: Record<ReviewSource, (hotel: { name: string; city: string; websiteUrl?: string | null }) => Promise<{ source: ReviewSource; averageRating: number; reviewCount: number; capturedAt: Date } | null>> = {
  GOOGLE: scrapeGoogle,
  EXPEDIA: async () => null,
  BOOKING: async () => null,
};

export async function runReviewSnapshot(
  hotelId: string,
  actorId: string,
  sources?: ReviewSource[],
) {
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const toRun = sources ?? (env.REVIEW_SCRAPER_ENABLED_SOURCES as ReviewSource[]);

  const results: Array<{ source: ReviewSource; averageRating: number; reviewCount: number; capturedAt: Date }> = [];

  for (const source of toRun) {
    const scraper = scrapers[source];
    if (!scraper) continue;
    const result = await scraper({
      name: hotel.name,
      city: hotel.city,
      websiteUrl: hotel.websiteUrl,
    });
    if (result) results.push(result);
  }

  for (const r of results) {
    await prisma.reviewSnapshot.create({
      data: {
        hotelId,
        source: r.source,
        averageRating: r.averageRating,
        reviewCount: r.reviewCount,
        rawJson: r,
        createdById: actorId,
        updatedById: actorId,
      },
    });
  }

  await logActivity({
    actorId,
    entityType: "ReviewSnapshot",
    entityId: hotelId,
    action: "CAPTURED",
    message: `Captured ${results.length} review sources for ${hotel.name}`,
    metadata: { sources: results.map((r) => r.source) },
  });

  return prisma.reviewSnapshot.findMany({
    where: { hotelId },
    orderBy: { capturedAt: "desc" },
    take: 10,
  });
}

export async function getLatestReviewSnapshots(hotelIds: string[]) {
  const byHotel = await prisma.reviewSnapshot.findMany({
    where: { hotelId: { in: hotelIds } },
    orderBy: { capturedAt: "desc" },
  });

  const latest: Record<string, Array<{ source: string; averageRating: number; reviewCount: number }>> = {};
  for (const s of byHotel) {
    if (!latest[s.hotelId]) latest[s.hotelId] = [];
    if (latest[s.hotelId].length >= 4) continue;
    if (latest[s.hotelId].some((x) => x.source === s.source)) continue;
    latest[s.hotelId].push({
      source: s.source,
      averageRating: Number(s.averageRating),
      reviewCount: s.reviewCount ?? 0,
    });
  }
  return latest;
}
