import { describe, expect, it } from "vitest";

import { transformSheetRows } from "@/lib/uploads/mapping";

describe("transformSheetRows", () => {
  it("normalizes core Expedia fields", () => {
    const rows = [
      {
        "Hotel Name": "The Atlantic Grand Atlanta",
        "Stay Date": "04/12/2026",
        "Capture Date": "03/11/2026",
        "Nightly Rate": "$245.00",
        Currency: "usd",
        Refundable: "Yes",
      },
    ];
    const result = transformSheetRows(
      rows,
      {
        hotel_name: "Hotel Name",
        hotel_code: null,
        stay_date: "Stay Date",
        capture_date: "Capture Date",
        file_date: null,
        room_type: null,
        rate_plan: null,
        refundable_flag: "Refundable",
        nightly_rate: "Nightly Rate",
        currency: "Currency",
        occupancy_or_availability_status: null,
      },
      { dateFormat: "MM/dd/yyyy", currencyDefault: "USD", stripCurrencySymbols: true, stripCommas: true },
    );

    expect(result[0].nightlyRate).toBe(245);
    expect(result[0].currency).toBe("USD");
    expect(result[0].refundableFlag).toBe(true);
    expect(result[0].errors).toHaveLength(0);
  });
});
