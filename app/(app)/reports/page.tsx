import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";

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
      {/* <div className="flex items-center justify-between">
    < div >
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Analysis workspaces, approval flow, presentation mode, and exports.</p>
        </div >
      </div > */
      }
      <Card className="rounded-2xl border-muted/50 overflow-hidden">
        <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
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
        <CardContent className="p-0">
          {reports.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="pl-6 text-md font-medium"><Link href={`/reports/${report.id}`} className="text-foreground hover:text-primary transition-colors">{report.name}</Link></TableCell>
                    <TableCell>{report.subjectHotel.name}</TableCell>
                    <TableCell>{report.status}</TableCell>
                    <TableCell>{formatDate(report.updatedAt)}</TableCell>
                    <TableCell>
                      <Link href={`/reports/${report.id}`} className="inline-flex items-center text-muted-foreground hover:text-primary">
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10">
              <EmptyState title="No reports" description="Create the first report for a subject hotel and compset." actionHref="/reports/new" actionLabel="New report" />
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
