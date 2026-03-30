import { env } from "@/lib/env";
import { extractPageFinding, type ExtractedPageFinding } from "@/lib/website/extractor";
import { fetchSitemapUrls } from "@/lib/website/sitemap";
import { isUrlSafeForCrawl } from "@/lib/website/url-safety";

const disallowedExtensions = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf",
  ".zip", ".doc", ".docx", ".xls", ".xlsx", ".mp4", ".mp3",
];

const ignoredPathFragments = ["/wp-admin", "/cdn-cgi", "/feed", "/cart", "/checkout"];

function shouldVisit(url: URL, origin: string) {
  if (url.origin !== origin) return false;
  if (disallowedExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext))) return false;
  if (ignoredPathFragments.some((f) => url.pathname.toLowerCase().includes(f))) return false;
  return true;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlWebsite(baseUrl: string, options?: { pageLimit?: number; maxDepth?: number }) {
  if (!isUrlSafeForCrawl(baseUrl)) {
    throw new Error("URL is not safe for crawling (internal/private addresses blocked).");
  }

  const startUrl = new URL(baseUrl).toString();
  const pageLimit = options?.pageLimit ?? env.WEBSITE_CRAWL_PAGE_LIMIT;
  const maxDepth = options?.maxDepth ?? env.WEBSITE_CRAWL_MAX_DEPTH;
  const delayMs = env.WEBSITE_CRAWL_DELAY_MS;

  let queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];

  // Sitemap-first: seed queue with sitemap URLs before link-follow
  try {
    const sitemapUrls = await fetchSitemapUrls(startUrl, pageLimit);
    if (sitemapUrls.length > 0) {
      queue = sitemapUrls.map((url) => ({ url, depth: 0 }));
    }
  } catch {
    // Fall back to start URL only
  }

  const visited = new Set<string>();
  const findings: ExtractedPageFinding[] = [];
  const origin = new URL(startUrl).origin;

  while (queue.length && findings.length < pageLimit) {
    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);

    if (delayMs > 0 && findings.length > 0) {
      await delay(delayMs);
    }

    const response = await fetch(next.url, {
      redirect: "follow",
      headers: { "user-agent": "HotelDemoIntelligenceBot/1.0 (+https://rankmenow.com)" },
      cache: "no-store",
    }).catch(() => null);

    if (!response || !response.ok) continue;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    const finding = extractPageFinding(next.url, html);
    findings.push(finding);

    if (next.depth >= maxDepth) continue;

    for (const link of finding.internalLinks) {
      try {
        const normalized = new URL(link);
        normalized.hash = "";
        const str = normalized.toString();
        if (shouldVisit(normalized, origin) && !visited.has(str) && isUrlSafeForCrawl(str)) {
          queue.push({ url: str, depth: next.depth + 1 });
        }
      } catch {
        // ignore invalid URLs
      }
    }
  }

  return findings;
}
