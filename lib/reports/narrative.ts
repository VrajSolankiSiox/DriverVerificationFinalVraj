import type { RateAnalyticsResult } from "@/lib/analytics/rate-analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function buildComparisonHeadline(
  subjectValue: number,
  compAverage: number,
  metric: string,
  higherIsBetter: boolean,
): string {
  const diff = subjectValue - compAverage;
  const behind = higherIsBetter ? diff < 0 : diff > 0;
  const absDiff = Math.abs(diff);
  return behind
    ? `You're ${formatNumber(absDiff, higherIsBetter ? 0 : 2)} ${higherIsBetter ? "points" : ""} behind your compset on ${metric}.`
    : `You're ahead of comps on ${metric} by ${formatNumber(absDiff, higherIsBetter ? 0 : 2)}.`;
}

export function buildExecutiveSummaryNarrative(analytics: RateAnalyticsResult) {
  const summary90 = analytics.summariesByWindow["90"];
  const rateGap = summary90.avgCompAverageRate - summary90.avgSubjectRate;
  const leadPhrase =
    rateGap > 0
      ? `Your public rates trail the compset average by ${formatCurrency(rateGap)}—comps are capturing more revenue on similar dates.`
      : `Your public rates exceed the compset average by ${formatCurrency(-rateGap)}.`;

  const phrases = [
    leadPhrase,
    `Across the observed 90-day window, you priced below comps on ${summary90.belowThresholdCount} of ${summary90.nights} nights and above on ${summary90.aboveThresholdCount} nights.`,
    `Average observed subject rate was ${formatCurrency(summary90.avgSubjectRate)} versus compset benchmark of ${formatCurrency(summary90.avgCompAverageRate)}.`,
    `Median gap: ${formatCurrency(summary90.medianGap)}. Rate index: ${formatNumber(summary90.avgRateIndex, 2)}.`,
    `Confidence: ${analytics.confidenceLevel} based on date coverage and compset completeness.`,
  ];

  if (analytics.weekdayWeekend.weekendSubjectAverage < analytics.weekdayWeekend.weekdaySubjectAverage) {
    phrases.push("Weekend positioning is weaker than weekday—you're leaving money on the table when demand is high.");
  }

  if (analytics.missingRateNights.length > 0) {
    phrases.push(
      `You had ${analytics.missingRateNights.length} nights with no publicly observed rate—comps may be winning those dates.`,
    );
  }

  return phrases.join(" ");
}

export function buildOpportunityBuckets(analytics: RateAnalyticsResult) {
  const summary30 = analytics.summariesByWindow["30"];
  return [
    {
      title: "Pricing Positioning",
      confidence: analytics.confidenceLevel,
      description:
        summary30.avgRateIndex < 1
          ? `You're underpricing on ${summary30.belowThresholdCount} nights—comps hold rate while you leave revenue on the table.`
          : `You're above comps on rate; ensure you're not losing share on high-demand dates.`,
      range: summary30.avgRateIndex < 1 ? "Moderate to High" : "Low to Moderate",
    },
    {
      title: "Direct Booking Conversion",
      confidence: analytics.confidenceLevel,
      description:
        "You're losing direct bookings to comps when guests bounce—strengthen booking paths and trust cues.",
      range: "Moderate",
    },
    {
      title: "Merchandising / Offer Visibility",
      confidence: analytics.confidenceLevel,
      description:
        "Comps out-merchandise you where rate gaps exist—improve on-site offer visibility and package exposure.",
      range: "Moderate",
    },
    {
      title: "Website Experience",
      confidence: analytics.confidenceLevel,
      description:
        "Commercial content and conversion paths lag comps—guests choose competitors when your site underperforms.",
      range: "Moderate",
    },
  ];
}

export function buildMethodologyNote() {
  return "Insights are based on uploaded market rate observations and publicly observable website data. This is not a substitute for PMS, CRS, STR, or proprietary financial records. Observations represent available data at the time of analysis.";
}
