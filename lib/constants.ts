import type { ReportSectionType } from "@prisma/client";

export const appName = "Rank Me Now — Hotel Demo Intelligence";

export const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/hotels", label: "Hotels" },
  { href: "/compsets", label: "CompSets" },
  { href: "/reports", label: "Reports" },
  { href: "/uploads", label: "Uploads" },
  // { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
] as const;

export const logicalUploadFields = [
  { key: "hotel_name", label: "Hotel Name", required: true },
  { key: "hotel_code", label: "Hotel Code", required: false },
  { key: "stay_date", label: "Stay Date", required: true },
  { key: "capture_date", label: "Capture Date", required: false },
  { key: "file_date", label: "File Date", required: false },
  { key: "room_type", label: "Room Type", required: false },
  { key: "rate_plan", label: "Rate Plan", required: false },
  { key: "refundable_flag", label: "Refundable Flag", required: false },
  { key: "nightly_rate", label: "Nightly Rate", required: true },
  { key: "currency", label: "Currency", required: true },
  { key: "occupancy_or_availability_status", label: "Availability Status", required: false },
] as const;

export const sectionTitleMap: Record<ReportSectionType, string> = {
  COVER: "Cover / Title",
  EXECUTIVE_SUMMARY: "Executive Summary",
  COMPETITIVE_GAP_SUMMARY: "Where You're Losing",
  SUBJECT_SNAPSHOT: "Subject Hotel Snapshot",
  COMPSET_OVERVIEW: "CompSet Overview",
  RATE_POSITIONING_SUMMARY: "Rate Positioning Summary",
  RATE_COMPARISON_90_DAY: "90-Day Rate Comparison",
  WEEKDAY_WEEKEND_POSITIONING: "Weekday vs Weekend Positioning",
  GAP_ANALYSIS: "Outlier Nights / Gap Analysis",
  WEBSITE_AUDIT: "Website Audit Findings",
  OPPORTUNITY_BUCKETS: "Opportunity Buckets",
  ACTION_PLAN_30_60_90: "Recommended 30/60/90-Day Actions",
  BATTLECARD: "Rep Battlecard",
  DISCLAIMER_METHOD: "Disclaimer / Methodology",
  REVIEW_SNAPSHOT: "Review Comparison",
  SEO_FINDINGS: "SEO Findings",
};

export const belowThreshold = -15;
export const aboveThreshold = 15;
