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

  it("normalizes rate-grid first header when excel exports None", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["None", "04/16", "04/17"],
      ["Days Inn by Wyndham Statesboro", "$65", "$65"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grid");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const sheets = parseWorkbookBuffer(buffer, "grid.xlsx");

    expect(sheets).toHaveLength(1);
    expect(sheets[0].headers[0]).toBe("Hotel Name");
    expect(sheets[0].rows[0]["Hotel Name"]).toBe("Days Inn by Wyndham Statesboro");
  });

  it("finds header row when title rows exist above the grid", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Statesboro Market Shopping Report"],
      ["Generated on", "2026-04-23"],
      ["Hotel Name", "04/16", "04/17"],
      ["Super 8 by Wyndham Statesboro", 70, 74],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const sheets = parseWorkbookBuffer(buffer, "report.xlsx");

    expect(sheets[0].headers[0]).toBe("Hotel Name");
    expect(sheets[0].rows[0]["Hotel Name"]).toBe("Super 8 by Wyndham Statesboro");
  });

  it("prepends Hotel Name when the first header cell is missing", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["04/16", "04/17", "04/18"],
      ["Days Inn by Wyndham Statesboro", "$65", "$65", "$65"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "MissingNameHeader");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

    const sheets = parseWorkbookBuffer(buffer, "missing-name-header.xlsx");

    expect(sheets[0].headers.slice(0, 4)).toEqual(["Hotel Name", "04/16", "04/17", "04/18"]);
    expect(sheets[0].rows[0]["Hotel Name"]).toBe("Days Inn by Wyndham Statesboro");
    expect(sheets[0].rows[0]["04/16"]).toBe("$65");
  });

});
