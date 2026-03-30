/**
 * SSRF protection: block internal/private IP ranges before fetching.
 */
const privateRanges = [
  /^127\./, // loopback
  /^10\./, // class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // class B private
  /^192\.168\./, // class C private
  /^169\.254\./, // link-local
  /^0\./, // current network
  /^localhost$/i,
];

export function isUrlSafeForCrawl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (privateRanges.some((re) => re.test(hostname))) {
      return false;
    }
    // Block numeric IPs that resolve to private ranges
    const parts = hostname.split(".");
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      const ip = parts.map((p) => parseInt(p, 10));
      if (ip[0] === 127) return false;
      if (ip[0] === 10) return false;
      if (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31) return false;
      if (ip[0] === 192 && ip[1] === 168) return false;
      if (ip[0] === 169 && ip[1] === 254) return false;
    }
    return true;
  } catch {
    return false;
  }
}
