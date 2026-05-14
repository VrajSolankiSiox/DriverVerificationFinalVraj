import Link from "next/link";
import { Suspense } from "react";
import { AlertBanner } from "@/components/reports/alert-banner";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardActivityChart } from "@/components/dashboard/activity-chart";
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
import { Building2, Network, AlertTriangle, FileBarChart, Database, Activity, PlayCircle, UploadCloud, MonitorPlay } from "lucide-react";
import { format, subDays } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; activityFilter?: string }>;
}) {
  const { filter, activityFilter = "daily" } = await searchParams;
  const dateFilter = filter || "all";

  let gteDate: Date | undefined;
  const now = new Date();
  if (dateFilter === "weekly") {
    gteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (dateFilter === "monthly") {
    gteDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  } else if (dateFilter === "yearly") {
    gteDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const dateCondition = gteDate ? { createdAt: { gte: gteDate } } : {};

  // For Activity Chart
  let activityGteDate: Date;
  if (activityFilter === "monthly") {
    activityGteDate = subDays(now, 180); // 6 months
  } else if (activityFilter === "weekly") {
    activityGteDate = subDays(now, 28); // 4 weeks
  } else {
    activityGteDate = subDays(now, 7); // 7 days
  }

  const [
    hotelCount,
    compsetHotelCount,
    uploadFailures,
    readyReports,
    recentReports,
    recentUploads,
    alerts,
    demoCount,
    snapshotCount,
    recentActivityReports,
    recentActivityUploads,
    recentActivityDemos,
    recentDemosList,
  ] = await Promise.all([
    prisma.hotel.count({ where: { profileSource: "MANUAL", ...dateCondition } }),
    prisma.compSetMember.count({ where: { roleType: "COMP", ...dateCondition } }),
    prisma.uploadBatch.count({
      where: { status: { in: ["FAILED", "PARTIAL_FAILED"] }, ...dateCondition },
    }),
    prisma.report.count({
      where: { status: { in: ["REVIEW_READY", "APPROVED"] }, ...dateCondition },
    }),
    prisma.report.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { subjectHotel: true },
    }),
    prisma.uploadBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { subjectHotel: true },
    }),
    getActiveAlerts(),
    prisma.demoSession.count({ where: dateCondition }),
    prisma.websiteSnapshot.count({ where: dateCondition }),
    prisma.report.findMany({
      where: { createdAt: { gte: activityGteDate } },
      select: { createdAt: true },
    }),
    prisma.uploadBatch.findMany({
      where: { createdAt: { gte: activityGteDate } },
      select: { createdAt: true },
    }),
    prisma.demoSession.findMany({
      where: { createdAt: { gte: activityGteDate } },
      select: { createdAt: true },
    }),
    prisma.demoSession.findMany({
      orderBy: [
        { scheduledDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 6,
    }),
  ]);

  const activityDataMap = new Map<string, { uploads: number; reports: number; demos: number }>();
  
  if (activityFilter === "monthly") {
    for (let i = 5; i >= 0; i--) {
      const d = format(new Date(now.getFullYear(), now.getMonth() - i, 1), "MMM yy");
      activityDataMap.set(d, { uploads: 0, reports: 0, demos: 0 });
    }
    recentActivityReports.forEach(r => {
      const d = format(r.createdAt, "MMM yy");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.reports++;
    });
    recentActivityUploads.forEach(u => {
      const d = format(u.createdAt, "MMM yy");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.uploads++;
    });
    recentActivityDemos.forEach(demo => {
      const d = format(demo.createdAt, "MMM yy");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.demos++;
    });
  } else if (activityFilter === "weekly") {
    for (let i = 3; i >= 0; i--) {
      const d = `Week ${4-i}`;
      activityDataMap.set(d, { uploads: 0, reports: 0, demos: 0 });
    }
    const getWeekKey = (date: Date) => {
      const diff = now.getTime() - date.getTime();
      const weeksAgo = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 4) return `Week ${4-weeksAgo}`;
      return null;
    };
    recentActivityReports.forEach(r => {
      const k = getWeekKey(r.createdAt);
      if (k && activityDataMap.has(k)) activityDataMap.get(k)!.reports++;
    });
    recentActivityUploads.forEach(u => {
      const k = getWeekKey(u.createdAt);
      if (k && activityDataMap.has(k)) activityDataMap.get(k)!.uploads++;
    });
    recentActivityDemos.forEach(demo => {
      const k = getWeekKey(demo.createdAt);
      if (k && activityDataMap.has(k)) activityDataMap.get(k)!.demos++;
    });
  } else {
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(now, i), "MMM dd");
      activityDataMap.set(d, { uploads: 0, reports: 0, demos: 0 });
    }
    recentActivityReports.forEach(r => {
      const d = format(r.createdAt, "MMM dd");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.reports++;
    });
    recentActivityUploads.forEach(u => {
      const d = format(u.createdAt, "MMM dd");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.uploads++;
    });
    recentActivityDemos.forEach(demo => {
      const d = format(demo.createdAt, "MMM dd");
      if (activityDataMap.has(d)) activityDataMap.get(d)!.demos++;
    });
  }

  const chartData = Array.from(activityDataMap.entries()).map(([date, data]) => ({
    date,
    ...data
  }));

  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <div className="space-y-8 pb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Internal sales intelligence workspace for hotel demos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border bg-white p-1 shadow-sm">
              <Link
                href="/dashboard?filter=all"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dateFilter === "all" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                All Time
              </Link>
              <Link
                href="/dashboard?filter=yearly"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dateFilter === "yearly" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                Yearly
              </Link>
              <Link
                href="/dashboard?filter=monthly"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dateFilter === "monthly" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                Monthly
              </Link>
              <Link
                href="/dashboard?filter=weekly"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dateFilter === "weekly" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              >
                Weekly
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Total Hotels"
              value={hotelCount}
              subtitle="Monitored properties"
              icon={<Building2 className="text-blue-500" />}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Reports Ready"
              value={readyReports}
              subtitle="Pending presentation"
              icon={<FileBarChart className="text-emerald-500" />}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Total Demos"
              value={demoCount}
              subtitle="Scheduled & Conducted"
              icon={<Database className="text-purple-500" />}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Compset Hotels"
              value={compsetHotelCount}
              subtitle="Tracked competitors"
              icon={<Network className="text-indigo-500" />}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Import Failures"
              value={uploadFailures}
              subtitle="Needs analyst review"
              icon={<AlertTriangle className="text-rose-500" />}
            />
          </div>
          <div className="col-span-1 xl:col-span-2">
            <MetricCard
              title="Website Audits"
              value={snapshotCount}
              subtitle="Captured snapshots"
              icon={<Activity className="text-amber-500" />}
            />
          </div>
        </div>

        <DashboardActivityChart data={chartData} currentFilter={activityFilter} />

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 flex items-center flex-row justify-between pb-4">
              <div className="flex">
                <CardTitle className="text-lg font-semibold text-slate-800">Recent reports</CardTitle>
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
                      <TableRow
                        key={report.id}
                        className="transition-colors hover:bg-muted/40"
                      >
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

          <Card className="rounded-2xl border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 flex items-center flex-row justify-between pb-4">
              <div className="flex">
                <CardTitle className="text-lg font-semibold text-slate-800">Recent uploads</CardTitle>
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
                      <TableRow
                        key={upload.id}
                        className="transition-colors hover:bg-muted/40"
                      >
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

          <Card className="rounded-2xl border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100/50 flex items-center flex-row justify-between pb-4">
              <div className="flex">
                <CardTitle className="text-lg font-semibold text-slate-800">Demos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentDemosList.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/40 hover:bg-white/40 border-slate-100">
                      <TableHead className="pl-6 text-slate-500 font-medium">Hotel</TableHead>
                      <TableHead className="text-slate-500 font-medium">Status</TableHead>
                      <TableHead className="text-slate-500 font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDemosList.map((demo) => (
                      <TableRow
                        key={demo.id}
                        className="transition-colors hover:bg-white/60 border-slate-100"
                      >
                        <TableCell className="pl-6 font-medium text-slate-700">
                          {demo.hotelName}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${demo.outcome === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                            demo.outcome === "PENDING" ? "bg-blue-100 text-blue-700" :
                              demo.outcome === "NO_SHOW" ? "bg-rose-100 text-rose-700" :
                                demo.outcome === "CANCELLED" ? "bg-slate-100 text-slate-700" :
                                  "bg-amber-100 text-amber-700"
                            }`}>
                            {demo.outcome?.toLowerCase()?.replace("_", "-") || "Pending"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {demo.scheduledDate ? formatDate(demo.scheduledDate, "dd MMM yy") : "TBD"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10">
                  <EmptyState
                    title="No demos yet"
                    description="Schedule a demo session."
                    actionHref="#"
                    actionLabel="New Demo"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>

  );
}
