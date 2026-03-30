import type { ReviewScraper, ReviewScraperResult } from "../types";

/**
 * Google Places scraper stub. Full implementation would use Google Places API
 * or Playwright to scrape hotel card from search results.
 */
export const scrapeGoogle: ReviewScraper = async (hotel): Promise<ReviewScraperResult | null> => {
  try {
    const hash = (hotel.name + hotel.city).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const avgRating = 3.8 + (hash % 12) / 10;
    const reviewCount = 30 + (hash % 150);
    return {
      source: "GOOGLE",
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount,
      capturedAt: new Date(),
    };
  } catch {
    return null;
  }
};
