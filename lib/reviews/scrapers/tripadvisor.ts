import type { ReviewScraper, ReviewScraperResult } from "../types";

/**
 * TripAdvisor scraper stub. Returns mock data for demo.
 * Full implementation would use Playwright to search by hotel name + city.
 */
export const scrapeTripAdvisor: ReviewScraper = async (hotel): Promise<ReviewScraperResult | null> => {
  try {
    // Stub: return demo data based on hotel name hash for consistency
    const hash = (hotel.name + hotel.city).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const avgRating = 3.5 + (hash % 15) / 10; // 3.5–4.9
    const reviewCount = 50 + (hash % 200);
    return {
      source: "TRIPADVISOR",
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount,
      capturedAt: new Date(),
    };
  } catch {
    return null;
  }
};
