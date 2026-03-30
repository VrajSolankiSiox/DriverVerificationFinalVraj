import * as cheerio from "cheerio";

export type ExtractedPageFinding = {
  url: string;
  pageType: string;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  canonical: string | null;
  robotsMeta: string | null;
  sitemapReference: boolean;
  internalLinks: string[];
  bookingCtaDetected: boolean;
  bookingCtaCount: number;
  bookingEngineDetected: boolean;
  phoneDetected: boolean;
  emailDetected: boolean;
  addressDetected: boolean;
  faqDetected: boolean;
  structuredDataDetected: boolean;
  imageCount: number;
  imageAltCoverage: number;
  brandConsistencyNotes: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
  schemaTypes: string[];
  rawHtml?: string;
};

const bookingKeywords = ["book", "reserve", "check availability", "book now"];
const pageTypes = ["home", "rooms", "offers", "contact", "amenities", "dining", "meetings", "weddings", "gallery", "about"];

export function classifyPage(url: URL, title: string | null) {
  const text = `${url.pathname} ${title ?? ""}`.toLowerCase();
  for (const pageType of pageTypes) {
    if (text.includes(pageType)) {
      return pageType;
    }
  }
  return url.pathname === "/" ? "home" : "other";
}

export function extractPageFinding(urlString: string, html: string): ExtractedPageFinding {
  const url = new URL(urlString);
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() ?? null;
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
  const structuredDataDetected = $('script[type="application/ld+json"]').length > 0;
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}") as { "@type"?: string; "@graph"?: Array<{ "@type"?: string }> };
      if (typeof json["@type"] === "string" && !schemaTypes.includes(json["@type"])) {
        schemaTypes.push(json["@type"]);
      }
      if (Array.isArray(json["@graph"])) {
        for (const g of json["@graph"]) {
          if (typeof g["@type"] === "string" && !schemaTypes.includes(g["@type"])) {
            schemaTypes.push(g["@type"]);
          }
        }
      }
    } catch {
      /* ignore */
    }
  });
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? null;
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() ?? null;
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() ?? null;
  const keywords = $('meta[name="keywords"]').attr("content")?.trim() ?? null;
  const phoneDetected = /\+?\d[\d\s().-]{7,}/.test(bodyText);
  const emailDetected = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(bodyText);
  const addressDetected = /(street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd\.|suite|floor|zip)/i.test(bodyText);
  const faqDetected = bodyText.toLowerCase().includes("faq") || bodyText.toLowerCase().includes("frequently asked questions");
  const sitemapReference = html.toLowerCase().includes("sitemap.xml") || $('a[href*="sitemap"]').length > 0;

  const internalLinks: string[] = $("a[href]")
    .map((_, el) => $(el).attr("href") || "")
    .get()
    .filter(Boolean)
    .map((href) => {
      try {
        return new URL(href, url.origin).toString();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value))
    .filter((candidate) => new URL(candidate).host === url.host);

  const bookingCtaCount = $("a, button")
    .toArray()
    .filter((el) => bookingKeywords.some((keyword) => $(el).text().toLowerCase().includes(keyword))).length;
  const bookingCtaDetected = bookingCtaCount > 0;
  const bookingEngineDetected = internalLinks.some((link) => /book|booking|reserv/i.test(link));
  const images = $("img").toArray();
  const withAlt = images.filter((img) => Boolean($(img).attr("alt")?.trim())).length;
  const imageAltCoverage = images.length ? withAlt / images.length : 1;

  const brandConsistencyNotes: string[] = [];
  if (title && !title.toLowerCase().includes(url.hostname.split(".")[0])) {
    brandConsistencyNotes.push("Title tag does not clearly reinforce domain brand naming.");
  }
  if (!metaDescription) {
    brandConsistencyNotes.push("Meta description missing on page.");
  }

  return {
    url: urlString,
    pageType: classifyPage(url, title),
    title,
    metaDescription,
    h1Count,
    h2Count,
    h3Count,
    wordCount,
    canonical,
    robotsMeta,
    sitemapReference,
    internalLinks: [...new Set(internalLinks)],
    bookingCtaDetected,
    bookingCtaCount,
    bookingEngineDetected,
    phoneDetected,
    emailDetected,
    addressDetected,
    faqDetected,
    structuredDataDetected,
    imageCount: images.length,
    imageAltCoverage,
    brandConsistencyNotes,
    ogTitle,
    ogDescription,
    ogImage,
    keywords,
    schemaTypes,
    rawHtml: html,
  };
}
