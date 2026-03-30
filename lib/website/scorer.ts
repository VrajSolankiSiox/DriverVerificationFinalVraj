import type { ExtractedPageFinding } from "@/lib/website/extractor";
import type { WebsiteScoreBreakdown } from "@/lib/types";

export function scoreWebsiteAudit(pages: ExtractedPageFinding[]): WebsiteScoreBreakdown {
  if (!pages.length) {
    return {
      total: 0,
      directBookingUx: 0,
      contentCompleteness: 0,
      technicalHygiene: 0,
      offerVisibility: 0,
      trustContactClarity: 0,
      notes: ["No pages were crawled."],
    };
  }

  const notes: string[] = [];
  const bookingPages = pages.filter((page) => page.bookingCtaDetected).length;
  const pagesWithDescriptions = pages.filter((page) => Boolean(page.metaDescription)).length;
  const pagesWithCanonical = pages.filter((page) => Boolean(page.canonical)).length;
  const pagesWithContactSignals = pages.filter(
    (page) => page.phoneDetected || page.emailDetected || page.addressDetected,
  ).length;
  const pagesWithOffers = pages.filter((page) => page.pageType === "offers" || page.pageType === "home");
  const pagesWithStructuredData = pages.filter((page) => page.structuredDataDetected).length;

  const directBookingUx = Math.min(20, bookingPages * 4 + (pages.some((page) => page.bookingEngineDetected) ? 4 : 0));
  const contentCompleteness = Math.min(
    20,
    pages.filter((page) => ["rooms", "offers", "amenities", "dining", "meetings", "gallery"].includes(page.pageType)).length * 3 +
      (pages.some((page) => page.faqDetected) ? 2 : 0),
  );
  const technicalHygiene = Math.min(
    20,
    Math.round((pagesWithDescriptions / pages.length) * 8) +
      Math.round((pagesWithCanonical / pages.length) * 6) +
      Math.round((pagesWithStructuredData / pages.length) * 6),
  );
  const offerVisibility = Math.min(20, pagesWithOffers.length * 6 + (pages.some((page) => page.bookingCtaCount >= 2) ? 4 : 0));
  const trustContactClarity = Math.min(20, Math.round((pagesWithContactSignals / pages.length) * 14) + (pages.some((page) => page.faqDetected) ? 6 : 0));

  if (directBookingUx < 12) {
    notes.push("Booking pathways appear inconsistent or too sparse across crawled pages.");
  }
  if (contentCompleteness < 12) {
    notes.push("Core commercial content such as offers, rooms, and amenities is incomplete or weakly exposed.");
  }
  if (technicalHygiene < 12) {
    notes.push("Technical hygiene signals are mixed: meta descriptions, canonicals, or schema markup are not consistently present.");
  }
  if (offerVisibility < 12) {
    notes.push("Offer visibility is low relative to a strong direct-booking merchandising standard.");
  }
  if (trustContactClarity < 12) {
    notes.push("Trust and contact clarity signals are not consistently easy to find.");
  }

  return {
    total: directBookingUx + contentCompleteness + technicalHygiene + offerVisibility + trustContactClarity,
    directBookingUx,
    contentCompleteness,
    technicalHygiene,
    offerVisibility,
    trustContactClarity,
    notes,
  };
}
