import { renderReportHtml } from "@/lib/reports/render-html";
import type { ReportViewModel } from "@/lib/reports/sections";

export async function generatePdf(viewModel: ReportViewModel, visibility: "CLIENT_SAFE" | "INTERNAL_FULL", outputPath: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml(viewModel, visibility), { waitUntil: "load" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
  } finally {
    await browser.close();
  }
}
