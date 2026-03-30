import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCompSet } from "@/lib/services/compsets";

export default async function CompSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const compSet = await getCompSet(id);
  if (!compSet) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{compSet.name}</h1>
        <p className="text-sm text-muted-foreground">Subject hotel: {compSet.subjectHotel.name}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Property</TableHead><TableHead>Role</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {compSet.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.displayOrder}</TableCell>
                  <TableCell>{member.hotel.name}</TableCell>
                  <TableCell>{member.roleType}</TableCell>
                  <TableCell>{member.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent uploads</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {compSet.uploadBatches.map((batch) => (
                <li key={batch.id}><Link href={`/uploads/${batch.id}`}>{batch.fileName}</Link></li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {compSet.reports.map((report) => (
                <li key={report.id}><Link href={`/reports/${report.id}`}>{report.name}</Link></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
