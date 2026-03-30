import { prisma } from "@/lib/prisma";
import { crawlWebsite } from "@/lib/website/crawler";
import { scoreSeoAudit } from "@/lib/website/seo-scorer";
import { isUrlSafeForCrawl } from "@/lib/website/url-safety";
import { scoreWebsiteAudit } from "@/lib/website/scorer";
import { getPageSpeedPlaceholder } from "@/lib/website/page-speed";
import { logActivity } from "@/lib/activity-log";

export async function runWebsiteAudit(hotelId: string, actorId: string) {
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  if (!hotel.websiteUrl) {
    throw new Error("Hotel does not have a website URL.");
  }
  if (!isUrlSafeForCrawl(hotel.websiteUrl)) {
    throw new Error("Website URL is not safe for crawling (internal/private addresses blocked).");
  }

  const snapshot = await prisma.websiteSnapshot.create({
    data: {
      hotelId,
      baseUrl: hotel.websiteUrl,
      status: "PENDING",
      createdById: actorId,
      updatedById: actorId,
    },
  });

  try {
    const findings = await crawlWebsite(hotel.websiteUrl);
    const score = scoreWebsiteAudit(findings);
    const seoScore = scoreSeoAudit(findings);
    const pageSpeed = await getPageSpeedPlaceholder();

    await prisma.websitePageSnapshot.createMany({
      data: findings.map((finding) => ({
        snapshotId: snapshot.id,
        url: finding.url,
        pageType: finding.pageType,
        crawlDepth: 0,
        title: finding.title,
        metaDescription: finding.metaDescription,
        h1Count: finding.h1Count,
        canonical: finding.canonical,
        robotsMeta: finding.robotsMeta,
        bookingCtaDetected: finding.bookingCtaDetected,
        bookingCtaCount: finding.bookingCtaCount,
        bookingEngineDetected: finding.bookingEngineDetected,
        phoneDetected: finding.phoneDetected,
        emailDetected: finding.emailDetected,
        addressDetected: finding.addressDetected,
        faqDetected: finding.faqDetected,
        structuredDataDetected: finding.structuredDataDetected,
        sitemapReference: finding.sitemapReference,
        imageCount: finding.imageCount,
        imageAltCoverage: finding.imageAltCoverage,
        internalLinksJson: finding.internalLinks,
        extractedJson: {
          brandConsistencyNotes: finding.brandConsistencyNotes,
          schemaTypes: finding.schemaTypes,
        },
        rawHtml: finding.rawHtml,
        h2Count: finding.h2Count,
        h3Count: finding.h3Count,
        wordCount: finding.wordCount,
        ogTagsJson:
          finding.ogTitle || finding.ogDescription || finding.ogImage
            ? { ogTitle: finding.ogTitle, ogDescription: finding.ogDescription, ogImage: finding.ogImage }
            : undefined,
      })),
    });

    const updated = await prisma.websiteSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: "COMPLETE",
        scoreTotal: score.total,
        directBookingUxScore: score.directBookingUx,
        contentCompletenessScore: score.contentCompleteness,
        technicalHygieneScore: score.technicalHygiene,
        offerVisibilityScore: score.offerVisibility,
        trustContactScore: score.trustContactClarity,
        seoScoreTotal: seoScore.total,
        seoFindingsJson: { notes: seoScore.notes, breakdown: seoScore },
        rawFindingsJson: findings,
        summaryJson: {
          notes: score.notes,
          pageSpeed,
          seoNotes: seoScore.notes,
        },
        completedAt: new Date(),
        updatedById: actorId,
      },
      include: { pages: true },
    });

    await logActivity({
      actorId,
      entityType: "WebsiteSnapshot",
      entityId: updated.id,
      action: "COMPLETED",
      message: `Completed website audit for ${hotel.name}`,
      metadata: { score: score.total },
    });

    return updated;
  } catch (error) {
    await prisma.websiteSnapshot.update({
      where: { id: snapshot.id },
      data: {
        status: "FAILED",
        summaryJson: {
          error: error instanceof Error ? error.message : "Unknown audit error",
        },
        completedAt: new Date(),
        updatedById: actorId,
      },
    });
    throw error;
  }
}
