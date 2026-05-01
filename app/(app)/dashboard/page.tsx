import Link from "next/link";
import { ToastContainer } from "react-toastify";
import { Suspense } from "react";
import { AlertBanner } from "@/components/reports/alert-banner";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getActiveAlerts } from "@/lib/services/alerts";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [
    hotelCount,
    compsetCount,
    uploadFailures,
    readyReports,
    recentReports,
    recentUploads,
    staleHotels,
    alerts,
  ] = await Promise.all([
    prisma.hotel.count(),
    prisma.compSet.count(),
    prisma.uploadBatch.count({
      where: { status: { in: ["FAILED", "PARTIAL_FAILED"] } },
    }),
    prisma.report.count({
      where: { status: { in: ["REVIEW_READY", "APPROVED"] } },
    }),
    prisma.report.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { subjectHotel: true },
    }),
    prisma.uploadBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { subjectHotel: true },
    }),
    prisma.hotel.findMany({
      take: 5,
      where: { websiteSnapshots: { none: {} } },
      orderBy: { updatedAt: "desc" },
    }),
    getActiveAlerts(),
  ]);

  return (
    <Suspense fallback={<p>Loading users...</p>}>
      <div className="space-y-8">
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal sales intelligence workspace for hotel demos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/reports/new">New report</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/uploads/new">New upload</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Hotels"
            value={hotelCount}
            subtitle="Reusable hotel profiles"
          />
          <MetricCard
            title="CompSets"
            value={compsetCount}
            subtitle="Manual compsets only"
          />
          <MetricCard
            title="Import failures"
            value={uploadFailures}
            subtitle="Need analyst review"
          />
          <MetricCard
            title="Reports ready"
            value={readyReports}
            subtitle="Review-ready or approved"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-muted/50 shadow-md overflow-hidden">
            <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
              <div className="flex">
                <CardTitle>Recent reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentReports.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="pl-6">Report</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.map((report) => (
                      <TableRow key={report.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/reports/${report.id}`}>
                            {report.name}
                          </Link>
                        </TableCell>
                        <TableCell>{report.status}</TableCell>
                        <TableCell>
                          {formatDate(report.updatedAt, "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10">
                  <EmptyState
                    title="No reports yet"
                    description="Create the first demo report."
                    actionHref="/reports/new"
                    actionLabel="Create report"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted/50 shadow-md overflow-hidden">
            <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
              <div className="flex">
                <CardTitle>Recent uploads</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentUploads.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="pl-6">File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hotel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUploads.map((upload) => (
                      <TableRow key={upload.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/uploads/${upload.id}`}>
                            {upload.fileName}
                          </Link>
                        </TableCell>
                        <TableCell>{upload.status}</TableCell>
                        <TableCell>{upload.subjectHotel.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10">
                  <EmptyState
                    title="No uploads yet"
                    description="Upload an Expedia rate file to begin analysis."
                    actionHref="/uploads/new"
                    actionLabel="Start upload"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-muted/50 shadow-md overflow-hidden">
          <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
            <div className="flex">
              <CardTitle>Hotels missing website audit</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {staleHotels.length ? (
              <ul className="space-y-2 text-sm">
                {staleHotels.map((hotel) => (
                  <li key={hotel.id}>
                    <Link href={`/hotels/${hotel.id}`}>{hotel.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                All recent hotels have at least one website audit snapshot.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
