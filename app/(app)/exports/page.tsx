import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listExports } from "@/lib/services/exports";
import { formatDate } from "@/lib/utils";

export default async function ExportsPage() {
  const exports = await listExports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Export center</h1>
        <p className="text-sm text-muted-foreground">Generated PPTX and PDF artifacts.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Type</TableHead><TableHead>Visibility</TableHead><TableHead>Status</TableHead><TableHead>Generated</TableHead><TableHead>Download</TableHead></TableRow></TableHeader>
            <TableBody>
              {exports.map((artifact) => (
                <TableRow key={artifact.id}>
                  <TableCell>{artifact.report.name}</TableCell>
                  <TableCell>{artifact.type}</TableCell>
                  <TableCell>{artifact.visibility}</TableCell>
                  <TableCell>{artifact.status}</TableCell>
                  <TableCell>{artifact.generatedAt ? formatDate(artifact.generatedAt, "dd MMM yyyy HH:mm") : "—"}</TableCell>
                  <TableCell>{artifact.status === "SUCCESS" ? <Link href={`/api/exports/${artifact.id}/download`}>Download</Link> : artifact.errorMessage ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
