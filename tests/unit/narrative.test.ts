import { describe, expect, it } from "vitest";

import { buildExecutiveSummaryNarrative } from "@/lib/reports/narrative";
import type { RateAnalyticsResult } from "@/lib/analytics/rate-analytics";

const analytics: RateAnalyticsResult = {
  daily: [],
  summariesByWindow: {
    "7": { nights: 7, avgSubjectRate: 200, avgCompAverageRate: 220, avgRateIndex: 0.91, medianGap: -20, subjectLowestCount: 3, subjectHighestCount: 1, belowThresholdCount: 2, aboveThresholdCount: 1 },
    "14": { nights: 14, avgSubjectRate: 202, avgCompAverageRate: 223, avgRateIndex: 0.91, medianGap: -21, subjectLowestCount: 4, subjectHighestCount: 1, belowThresholdCount: 3, aboveThresholdCount: 1 },
    "30": { nights: 30, avgSubjectRate: 205, avgCompAverageRate: 225, avgRateIndex: 0.91, medianGap: -20, subjectLowestCount: 10, subjectHighestCount: 2, belowThresholdCount: 8, aboveThresholdCount: 2 },
    "90": { nights: 90, avgSubjectRate: 210, avgCompAverageRate: 230, avgRateIndex: 0.91, medianGap: -20, subjectLowestCount: 25, subjectHighestCount: 5, belowThresholdCount: 20, aboveThresholdCount: 4 },
  },
  weekdayWeekend: { weekdaySubjectAverage: 215, weekendSubjectAverage: 205, weekdayCompAverage: 232, weekendCompAverage: 228 },
  rankDistribution: { lowest: 25, middle: 40, highest: 5, missing: 20 },
  outlierNights: [],
  compressionLikeNights: [],
  missingRateNights: ["2026-04-12"],
  staleRatePatternDates: [],
  compSummaryTable: [],
  confidenceLevel: "HIGH",
};

describe("buildExecutiveSummaryNarrative", () => {
  it("uses business-safe phrasing", () => {
    const narrative = buildExecutiveSummaryNarrative(analytics);
    expect(narrative).toContain("publicly observed rate positioning suggests");
    expect(narrative).toContain("Confidence is classified as HIGH");
  });
});
