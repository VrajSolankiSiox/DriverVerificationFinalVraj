import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, FileText, UploadCloud } from "lucide-react";

import { MemberWebsiteAuditButton } from "@/components/compsets/member-website-audit-button";
import { RunAllCompetitorAuditsButton } from "@/components/compsets/run-all-competitor-audits-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompSet, parseCompMemberMetadata } from "@/lib/services/compsets";
import { formatDate } from "@/lib/utils";

export default async function CompSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const compSet = await getCompSet(id);

  if (!compSet) {
    notFound();
  }

  const compMembers = compSet.members.filter((m) => m.roleType === "COMP");
  const competitorHotelIds = compMembers.map((m) => m.hotel.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{compSet.name}</h1>
          <p className="text-sm text-muted-foreground">
            Main property:{" "}
            <Link
              href={`/hotels/${compSet.subjectHotel.id}`}
              className="text-primary hover:underline"
            >
              {compSet.subjectHotel.name}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/compsets/${compSet.id}/edit`}>Edit</Link>
          </Button>
          <RunAllCompetitorAuditsButton competitorHotelIds={competitorHotelIds} />
          <Button asChild variant="outline">
            <Link href={`/reports/new?compSetId=${compSet.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/uploads/new?compSetId=${compSet.id}`}>
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Rates
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-2xl border-muted/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between rounded-t-2xl border-b bg-white">
            <CardTitle>
              Competitor Hotels{" "}
              <span className="ml-2 inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {compMembers.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {compMembers.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Star</TableHead>
                    <TableHead>Rooms</TableHead>
                    <TableHead>Expedia Rating</TableHead>
                    <TableHead>Website Score</TableHead>
                    <TableHead>SEO Score</TableHead>
                    <TableHead>Audit</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compMembers.map((member) => {
                    const latestSnapshot = member.hotel.websiteSnapshots?.[0];
                    const memberMetadata = parseCompMemberMetadata(member.notes);
                    const expediaRating = memberMetadata.ratings.expedia?.value;
                    return (
                      <TableRow
                        key={member.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="pl-6 text-muted-foreground">
                          {member.displayOrder}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <Link
                              href={`/hotels/${member.hotel.id}`}
                              className="hover:text-primary transition-colors"
                            >
                              {member.hotel.name}
                            </Link>
                          </div>
                          {member.hotel.websiteUrl ? (
                            <a
                              href={member.hotel.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block max-w-[200px] truncate text-xs text-muted-foreground hover:text-primary"
                            >
                              {member.hotel.websiteUrl}
                            </a>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {memberMetadata.starRating != null
                            ? memberMetadata.starRating.toFixed(1)
                            : "-"}
                        </TableCell>
                        <TableCell>{memberMetadata.roomCount ?? "-"}</TableCell>
                        <TableCell>
                          {expediaRating ? (
                            <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium">
                              {expediaRating}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {latestSnapshot?.scoreTotal != null ? (
                            <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium">
                              {latestSnapshot.scoreTotal}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {latestSnapshot?.seoScoreTotal != null ? (
                            <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium">
                              {latestSnapshot.seoScoreTotal}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <MemberWebsiteAuditButton
                            hotelId={member.hotel.id}
                            disabled={!member.hotel.websiteUrl}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/hotels/${member.hotel.id}`}
                            className="inline-flex items-center text-muted-foreground hover:text-primary"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">
                  No competitor hotels found in this compset.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle>CompSet Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Version:</strong> {compSet.version}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={[
                    "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium",
                    compSet.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {compSet.isActive ? "Active" : "Inactive"}
                </span>
              </p>
              <p>
                <strong>Created:</strong> {formatDate(compSet.createdAt)}
              </p>
              <p>
                <strong>Updated:</strong> {formatDate(compSet.updatedAt)}
              </p>
              {compSet.notes ? (
                <p>
                  <strong>Notes:</strong> {compSet.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reports</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/reports/new?compSetId=${compSet.id}`}>
                  <FileText className="mr-1 h-4 w-4" />
                  New
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {compSet.reports.length ? (
                <ul className="divide-y">
                  {compSet.reports.map((report) => (
                    <li key={report.id}>
                      <Link
                        href={`/reports/${report.id}`}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="truncate font-medium">{report.name}</span>
                        <span className="ml-2 inline-flex shrink-0 items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {report.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">No reports yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {compSet.uploadBatches.length ? (
                <ul className="divide-y">
                  {compSet.uploadBatches.map((batch) => (
                    <li key={batch.id}>
                      <Link
                        href={`/uploads/${batch.id}`}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="truncate font-medium">{batch.fileName}</span>
                        <span className="ml-2 inline-flex shrink-0 items-center rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {batch.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-sm text-muted-foreground">No uploads yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
