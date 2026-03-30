import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireApiUser: vi.fn().mockResolvedValue({ id: "user_1" }),
}));

vi.mock("@/lib/services/exports", () => {
  const p = require("path");
  const root = p.join(process.cwd(), "storage", "exports");
  return {
    getExportArtifact: vi.fn().mockResolvedValue({
      id: "artifact_1",
      status: "SUCCESS",
      type: "PDF",
      storagePath: p.join(root, "1234567890-report.pdf"),
      fileName: "report.pdf",
    }),
  };
});

vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("pdf-data")),
}));

describe("export download route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns downloadable response when artifact exists", async () => {
    const module = await import("@/app/api/exports/[id]/download/route");
    const response = await module.GET(new Request("http://localhost:3000/api/exports/artifact_1/download"), {
      params: Promise.resolve({ id: "artifact_1" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
  });
});
