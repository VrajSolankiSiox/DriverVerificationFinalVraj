import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReports } from "@/lib/services/reports";
import { formatDate } from "@/lib/utils";

export default async function ReportsPage() {
  const reports = await listReports();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Analysis workspaces, approval flow, presentation mode, and exports.</p>
        </div>
        <Button asChild><Link href="/reports/new">New report</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Report list</CardTitle></CardHeader>
        <CardContent>
          {reports.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell><Link href={`/reports/${report.id}`}>{report.name}</Link></TableCell>
                    <TableCell>{report.subjectHotel.name}</TableCell>
                    <TableCell>{report.status}</TableCell>
                    <TableCell>{formatDate(report.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No reports" description="Create the first report for a subject hotel and compset." actionHref="/reports/new" actionLabel="New report" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
