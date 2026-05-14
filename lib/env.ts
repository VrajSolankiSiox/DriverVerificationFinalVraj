import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  APP_BASE_URL: z.string().url(),
  PLAYWRIGHT_BROWSERS_PATH: z.string().optional(),
  WEBSITE_CRAWL_PAGE_LIMIT: z.coerce.number().int().positive().default(10),
  WEBSITE_CRAWL_MAX_DEPTH: z.coerce.number().int().positive().default(2),
  WEBSITE_CRAWL_DELAY_MS: z.coerce.number().int().min(0).default(500),
  USE_HEADLESS_CRAWLER: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  REVIEW_SCRAPER_ENABLED_SOURCES: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()) : ["GOOGLE"])),
  FEATURE_PAGE_SPEED_ADAPTER: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
  WEBSITE_CRAWL_PAGE_LIMIT: process.env.WEBSITE_CRAWL_PAGE_LIMIT ?? "10",
  WEBSITE_CRAWL_MAX_DEPTH: process.env.WEBSITE_CRAWL_MAX_DEPTH ?? "2",
  WEBSITE_CRAWL_DELAY_MS: process.env.WEBSITE_CRAWL_DELAY_MS ?? "500",
  USE_HEADLESS_CRAWLER: process.env.USE_HEADLESS_CRAWLER,
  REVIEW_SCRAPER_ENABLED_SOURCES: process.env.REVIEW_SCRAPER_ENABLED_SOURCES,
  FEATURE_PAGE_SPEED_ADAPTER: process.env.FEATURE_PAGE_SPEED_ADAPTER,
});
