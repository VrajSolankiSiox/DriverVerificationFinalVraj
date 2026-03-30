import { describe, expect, it } from "vitest";

import { computeRateAnalytics } from "@/lib/analytics/rate-analytics";

describe("computeRateAnalytics", () => {
  it("computes summary metrics from subject and comp observations", () => {
    const observations = [
      {
        hotelId: "subject",
        hotelName: "Subject",
        roleType: "SUBJECT" as const,
        stayDate: new Date("2026-04-01"),
        captureDate: new Date("2026-03-11"),
        nightlyRate: 200,
        currency: "USD",
      },
      {
        hotelId: "comp1",
        hotelName: "Comp 1",
        roleType: "COMP" as const,
        stayDate: new Date("2026-04-01"),
        captureDate: new Date("2026-03-11"),
        nightlyRate: 220,
        currency: "USD",
      },
      {
        hotelId: "comp2",
        hotelName: "Comp 2",
        roleType: "COMP" as const,
        stayDate: new Date("2026-04-01"),
        captureDate: new Date("2026-03-11"),
        nightlyRate: 240,
        currency: "USD",
      },
    ];

    const result = computeRateAnalytics(observations, "subject", 7);

    expect(result.daily[0].compAverage).toBe(230);
    expect(result.daily[0].gapToCompAverage).toBe(-30);
    expect(result.rankDistribution.lowest).toBeGreaterThanOrEqual(1);
  });
});
