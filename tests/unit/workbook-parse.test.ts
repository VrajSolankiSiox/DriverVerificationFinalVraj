import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseWorkbookBuffer } from "@/lib/uploads/parse-workbook";

describe("parseWorkbookBuffer", () => {
  it("reads workbook sheets and headers", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      { "Hotel Name": "A", "Stay Date": "2026-04-01", Rate: 120 },
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rates");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const sheets = parseWorkbookBuffer(buffer, "sample.xlsx");

    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe("Rates");
    expect(sheets[0].headers).toContain("Hotel Name");
  });
});
