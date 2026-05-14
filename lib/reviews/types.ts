export type ReviewSource = "GOOGLE" | "EXPEDIA" | "BOOKING";

export type ReviewScraperResult = {
  source: ReviewSource;
  averageRating: number;
  reviewCount: number;
  reviews?: { rating: number; date: string; snippet: string }[];
  capturedAt: Date;
};

export type ReviewScraper = (hotel: {
  name: string;
  city: string;
  websiteUrl?: string | null;
}) => Promise<ReviewScraperResult | null>;
