import { renderReportHtml } from "@/lib/reports/render-html";
import { buildReportViewModel } from "@/lib/services/reports";

export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewModel = await buildReportViewModel(id);
  const html = renderReportHtml(viewModel, "CLIENT_SAFE");
  return <iframe title="print-view" className="min-h-screen w-full border-0" srcDoc={html} />;
}
