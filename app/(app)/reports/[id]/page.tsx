import { notFound } from "next/navigation";

import { AlertBanner } from "@/components/reports/alert-banner";
import { ReportComparisonWorkspace } from "@/components/reports/report-comparison-workspace";
import { buildReportViewModel, getReport } from "@/lib/services/reports";
import { getActiveAlerts } from "@/lib/services/alerts";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    notFound();
  }

  const [viewModel, alerts] = await Promise.all([
    buildReportViewModel(id),
    getActiveAlerts({ reportId: id }),
  ]);

  return (
    <>
      {/* {alerts.length > 0 ? <AlertBanner alerts={alerts} /> : null} */}
      <ReportComparisonWorkspace
        report={{
          id: report.id,
          status: report.status,
          subjectHotel: { id: report.subjectHotel.id, name: report.subjectHotel.name },
          compSet: { name: report.compSet.name },
          uploadBatch: report.uploadBatch
            ? { fileName: report.uploadBatch.fileName }
            : null,
        }}
        viewModel={viewModel}
      />
    </>
  );
}
