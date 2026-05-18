import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPresentations } from "@/lib/services/presentations";
import { formatDate } from "@/lib/utils";

export default async function PresentationsPage() {
  const presentations = await listPresentations();

  return (
    <div className="space-y-8">
      <Card className="overflow-visible rounded-2xl border-muted/50">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
          <CardTitle>Saved presentations</CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible p-0">
          {presentations.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presentations.map((presentation) => (
                  <TableRow key={presentation.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="pl-6 text-md font-medium">{presentation.name}</TableCell>
                    <TableCell>{presentation.report.name}</TableCell>
                    <TableCell>{presentation.report.subjectHotel.name}</TableCell>
                    <TableCell>{formatDate(presentation.updatedAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/presentations/${presentation.id}/edit`}>Edit</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/reports/${presentation.report.id}/present?presentationId=${presentation.id}`}>Present</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-sm text-slate-600">No saved presentations yet. Open a report and create one from Presentation mode.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
