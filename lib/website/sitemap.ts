import { isUrlSafeForCrawl } from "@/lib/website/url-safety";

export async function fetchSitemapUrls(
  baseUrl: string,
  pageLimit: number,
): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const urls: string[] = [];
  const seen = new Set<string>();

  async function fetchRobotsAndSitemap(): Promise<string[]> {
    const robotsUrl = `${origin}/robots.txt`;
    if (!isUrlSafeForCrawl(robotsUrl)) return [];

    const res = await fetch(robotsUrl, {
      headers: { "user-agent": "HotelDemoIntelligenceBot/1.0 (+https://rankmenow.com)" },
      cache: "no-store",
    }).catch(() => null);

    if (!res?.ok) return [];

    const text = await res.text();
    const sitemapMatches = text.matchAll(/Sitemap:\s*(.+)/gi);
    const sitemaps: string[] = [];
    for (const m of sitemapMatches) {
      const u = m[1]?.trim();
      if (u && isUrlSafeForCrawl(u)) sitemaps.push(u);
    }
    return sitemaps;
  }

  async function parseSitemap(sitemapUrl: string): Promise<string[]> {
    if (!isUrlSafeForCrawl(sitemapUrl)) return [];
    const res = await fetch(sitemapUrl, {
      headers: { "user-agent": "HotelDemoIntelligenceBot/1.0 (+https://rankmenow.com)" },
      cache: "no-store",
    }).catch(() => null);
    if (!res?.ok) return [];

    const xml = await res.text();
    const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
    const out: string[] = [];
    for (const m of locMatches) {
      const u = m[1]?.trim();
      if (u && isUrlSafeForCrawl(u) && new URL(u).origin === origin) {
        const lower = u.toLowerCase();
        if (
          !lower.endsWith(".xml") &&
          !lower.match(/\.(jpg|jpeg|png|gif|webp|pdf|zip)$/)
        ) {
          out.push(u);
        }
      }
    }
    return out;
  }

  const sitemaps = await fetchRobotsAndSitemap();
  const indexSitemap = `${origin}/sitemap.xml`;
  if (!sitemaps.includes(indexSitemap) && isUrlSafeForCrawl(indexSitemap)) {
    sitemaps.unshift(indexSitemap);
  }

  for (const sm of sitemaps) {
    if (urls.length >= pageLimit) break;
    const locs = await parseSitemap(sm);
    for (const u of locs) {
      if (seen.has(u)) continue;
      seen.add(u);
      urls.push(u);
      if (urls.length >= pageLimit) break;
    }
  }

  return urls.slice(0, pageLimit);
}
