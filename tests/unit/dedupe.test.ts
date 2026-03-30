import { describe, expect, it } from "vitest";

import { buildRateObservationKey } from "@/lib/uploads/dedupe";

describe("buildRateObservationKey", () => {
  it("builds deterministic keys for identical observations", () => {
    const keyOne = buildRateObservationKey({
      hotelId: "hotel_1",
      stayDate: new Date("2026-04-01"),
      captureDate: new Date("2026-03-15"),
      roomType: "King",
      ratePlan: "BAR",
      refundableFlag: true,
      nightlyRate: 210,
      currency: "USD",
    });
    const keyTwo = buildRateObservationKey({
      hotelId: "hotel_1",
      stayDate: new Date("2026-04-01"),
      captureDate: new Date("2026-03-15"),
      roomType: "King",
      ratePlan: "BAR",
      refundableFlag: true,
      nightlyRate: 220,
      currency: "USD",
    });

    expect(keyOne).toEqual(keyTwo);
  });
});
