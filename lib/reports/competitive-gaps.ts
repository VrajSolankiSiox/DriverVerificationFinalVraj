import type { RateAnalyticsResult } from "@/lib/analytics/rate-analytics";
import { formatCurrency } from "@/lib/utils";

export type CompetitiveGap = {
  metric: string;
  subjectValue: string | number;
  compAverage: string | number | null;
  rank: string | null;
  verdict: string;
};

export type CompetitiveGapsInput = {
  analytics: RateAnalyticsResult;
  websiteScore: number | null;
  compCount: number;
  seoScore?: number | null;
  reviewSubject?: Array<{ source: string; averageRating: number; reviewCount: number }>;
  reviewComps?: Array<{ hotelName: string; snapshots: Array<{ source: string; averageRating: number; reviewCount: number }> }>;
};

export function buildCompetitiveGaps(
  analytics: RateAnalyticsResult,
  websiteScore: number | null,
  compCount: number,
  options?: { seoScore?: number | null; reviewSubject?: Array<{ source: string; averageRating: number; reviewCount: number }>; reviewComps?: Array<{ hotelName: string; snapshots: Array<{ source: string; averageRating: number; reviewCount: number }> }> },
): CompetitiveGap[] {
  const summary90 = analytics.summariesByWindow["90"];
  const rateGap = summary90.avgCompAverageRate - summary90.avgSubjectRate;
  const rateIndex = summary90.avgRateIndex;

  const totalHotels = compCount + 1;
  const rateRank =
    rateIndex < 0.9 ? totalHotels : rateIndex < 1 ? totalHotels - 1 : rateIndex < 1.05 ? 2 : 1;

  const gaps: CompetitiveGap[] = [
    {
      metric: "Rate positioning",
      subjectValue: formatCurrency(summary90.avgSubjectRate),
      compAverage: formatCurrency(summary90.avgCompAverageRate),
      rank: `${rateRank} of ${totalHotels}`,
      verdict: rateGap > 0 ? "Leaving revenue on the table" : "Ahead of comps",
    },
    {
      metric: "Website score",
      subjectValue: websiteScore ?? "—",
      compAverage: null,
      rank: null,
      verdict: websiteScore != null && websiteScore < 80 ? "Guests bouncing to competitors" : "—",
    },
    (() => {
      const subj = options?.reviewSubject ?? [];
      const comps = options?.reviewComps ?? [];
      const subjAvg = subj.length ? subj.reduce((a, s) => a + s.averageRating, 0) / subj.length : null;
      const compAvgs = comps.map((c) => c.snapshots.length ? c.snapshots.reduce((a, s) => a + s.averageRating, 0) / c.snapshots.length : 0).filter((n) => n > 0);
      const compAvg = compAvgs.length ? compAvgs.reduce((a, b) => a + b, 0) / compAvgs.length : null;
      const allScores = [...(subjAvg != null ? [subjAvg] : []), ...compAvgs];
      allScores.sort((a, b) => b - a);
      const rank = subjAvg != null && allScores.length ? allScores.indexOf(subjAvg) + 1 : null;
      const total = compCount + 1;
      return {
        metric: "Reviews",
        subjectValue: subjAvg != null ? subjAvg.toFixed(1) : "—",
        compAverage: compAvg != null ? compAvg.toFixed(1) : null,
        rank: rank != null ? `${rank} of ${total}` : null,
        verdict: subjAvg != null && compAvg != null && subjAvg < compAvg ? "Comps outrank you on review scores" : subj.length ? "—" : "Add review snapshots to compare",
      };
    })(),
    (() => {
      const seo = options?.seoScore;
      return {
        metric: "SEO",
        subjectValue: seo ?? "—",
        compAverage: null,
        rank: null,
        verdict: seo != null && seo < 70 ? "Your site is invisible where comps rank" : seo != null ? "—" : "Add SEO audit to compare",
      };
    })(),
  ];

  return gaps;
}
