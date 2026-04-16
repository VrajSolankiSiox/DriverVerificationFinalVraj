import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompSet } from "@/lib/services/compsets";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{compSet.name}</h1>
        <p className="text-sm text-muted-foreground">
          Subject hotel: {compSet.subjectHotel.name}
        </p>
        {compSet.expediaUrl && (
          <p className="text-sm text-muted-foreground mt-1">
            Expedia:{" "}
            <a
              href={compSet.expediaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {compSet.expediaUrl}
            </a>
          </p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expedia Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compSet.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.displayOrder + 1}</TableCell>
                  <TableCell>{member.hotel.name}</TableCell>
                  <TableCell>{member.roleType}</TableCell>
                  <TableCell>
                    {member.hotel.expediaUrl ? (
                      <a
                        href={member.hotel.expediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
