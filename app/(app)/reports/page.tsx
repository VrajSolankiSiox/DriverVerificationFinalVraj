import Link from "next/link";
import { Plus, EllipsisVertical, Eye } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReports } from "@/lib/services/reports";
import { formatDate } from "@/lib/utils";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <div className="space-y-8 ">
      <Card className="overflow-visible rounded-2xl border-muted/50">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
          <div className="flex">
            <CardTitle>Report list</CardTitle>
          </div>
          <div>
            <Button asChild size="lg" className="gap-2 rounded-xl shadow-sm">
              <Link href="/reports/new">
                <Plus className="h-4 w-4" />
                New report
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-visible p-0">
          {reports.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="pl-6 text-md font-medium"><Link href={`/reports/${report.id}`} className="text-foreground transition-colors hover:text-primary">{report.name}</Link></TableCell>
                    <TableCell>{report.subjectHotel.name}</TableCell>
                    <TableCell>{report.status}</TableCell>
                    <TableCell>{formatDate(report.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <details name="report-actions-menu" className="relative inline-block">
                        <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <EllipsisVertical className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                          <Link
                            href={`/reports/${report.id}`}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10">
              <EmptyState title="No reports" description="Create the first report for a main property and compset." actionHref="/reports/new" actionLabel="New report" />
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
