import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
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
import { listCompSets } from "@/lib/services/compsets";

export default async function CompSetsPage() {
  const compsets = await listCompSets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CompSets</h1>
          <p className="text-sm text-muted-foreground">
            Manual compsets defined before demo analysis.
          </p>
        </div>
        <Button asChild>
          <Link href="/compsets/new">Create compset</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>CompSet list</CardTitle>
        </CardHeader>
        <CardContent>
          {compsets.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compsets.map((compSet) => (
                  <TableRow key={compSet.id}>
                    <TableCell>
                      <Link href={`/compsets/${compSet.id}`}>
                        {compSet.subjectHotel.name}
                      </Link>
                    </TableCell>
                    <TableCell>{compSet.members.length}</TableCell>
                    <TableCell>{compSet.version}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No compsets"
              description="Create your first manual compset."
              actionHref="/compsets/new"
              actionLabel="Create compset"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
