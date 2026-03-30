import type { ExtractedPageFinding } from "@/lib/website/extractor";

export type SEOScoreBreakdown = {
  titleQuality: number;
  metaQuality: number;
  headingStructure: number;
  schemaMarkup: number;
  mobileSignals: number;
  total: number;
  notes: string[];
};

function scoreTitle(title: string | null): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!title || !title.trim()) {
    return { score: 0, notes: ["Title tag is missing."] };
  }
  const len = title.length;
  if (len < 30) notes.push("Title is too short (aim for 50–60 characters).");
  else if (len > 60) notes.push("Title is too long (aim for 50–60 characters).");
  else notes.push("Title length is good.");
  const score = len >= 50 && len <= 60 ? 100 : len >= 30 && len <= 70 ? 70 : len > 0 ? 40 : 0;
  return { score, notes };
}

function scoreMeta(meta: string | null): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!meta || !meta.trim()) {
    return { score: 0, notes: ["Meta description is missing."] };
  }
  const len = meta.length;
  if (len < 120) notes.push("Meta description is too short (aim for 150–160 characters).");
  else if (len > 165) notes.push("Meta description is too long (aim for 150–160 characters).");
  else notes.push("Meta description length is good.");
  const score = len >= 150 && len <= 160 ? 100 : len >= 120 && len <= 165 ? 70 : 40;
  return { score, notes };
}

function scoreHeadings(f: ExtractedPageFinding): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;
  if (f.h1Count === 0) {
    notes.push("No H1 heading found.");
    score -= 40;
  } else if (f.h1Count > 1) {
    notes.push("Multiple H1 headings; use a single H1 per page.");
    score -= 20;
  }
  if (f.h2Count === 0 && f.h3Count === 0 && f.wordCount > 200) {
    notes.push("Page has substantial content but no H2/H3 structure.");
    score -= 20;
  }
  return { score: Math.max(0, score), notes };
}

function scoreSchema(f: ExtractedPageFinding): { score: number; notes: string[] } {
  const notes: string[] = [];
  if (!f.schemaTypes.length) {
    return { score: 0, notes: ["No JSON-LD schema markup detected."] };
  }
  const hotelTypes = ["Hotel", "LodgingBusiness", "Accommodation"];
  const hasRelevant = f.schemaTypes.some((t) => hotelTypes.some((h) => t.includes(h)));
  if (hasRelevant) notes.push(`Schema types found: ${f.schemaTypes.join(", ")}.`);
  else notes.push(`Schema present but consider adding Hotel/LodgingBusiness: ${f.schemaTypes.join(", ")}.`);
  return { score: hasRelevant ? 100 : 60, notes };
}

function scoreMobile(f: ExtractedPageFinding): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;
  if (!f.ogTitle && !f.ogDescription) {
    notes.push("Open Graph tags missing; social sharing may be poor.");
    score -= 30;
  }
  if (f.imageCount > 0 && f.imageAltCoverage < 1) {
    notes.push(`Only ${Math.round(f.imageAltCoverage * 100)}% of images have alt text.`);
    score -= 20;
  }
  return { score: Math.max(0, score), notes };
}

export function scoreSeoAudit(findings: ExtractedPageFinding[]): SEOScoreBreakdown {
  const notes: string[] = [];
  const homeOrPrimary = findings.find((f) => f.pageType === "home") ?? findings[0];
  if (!homeOrPrimary) {
    return { titleQuality: 0, metaQuality: 0, headingStructure: 0, schemaMarkup: 0, mobileSignals: 0, total: 0, notes: ["No pages to score."] };
  }

  const t = scoreTitle(homeOrPrimary.title);
  const m = scoreMeta(homeOrPrimary.metaDescription);
  const h = scoreHeadings(homeOrPrimary);
  const s = scoreSchema(homeOrPrimary);
  const mob = scoreMobile(homeOrPrimary);

  notes.push(...t.notes, ...m.notes, ...h.notes, ...s.notes, ...mob.notes);

  const total = Math.round((t.score + m.score + h.score + s.score + mob.score) / 5);
  return {
    titleQuality: t.score,
    metaQuality: m.score,
    headingStructure: h.score,
    schemaMarkup: s.score,
    mobileSignals: mob.score,
    total: Math.min(100, total),
    notes: [...new Set(notes)],
  };
}
