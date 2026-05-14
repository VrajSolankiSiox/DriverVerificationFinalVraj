import Link from "next/link";
import { Plus, Building2, Users, Layers3, EllipsisVertical, Eye, PencilLine } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listCompSets } from "@/lib/services/compsets";

export default async function CompSetsPage() {
  const compsets = await listCompSets();

  const totalMembers = compsets.reduce(
    (sum, item) =>
      sum + item.members.filter((member) => member.roleType === "COMP").length,
    0,
  );

  return (
    <div className="space-y-8 ">
      {/* Stats */}
      {compsets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-3">
                <Layers3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total CompSets</p>
                <p className="text-2xl font-semibold">{compsets.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-semibold">{totalMembers}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-muted/50 shadow-sm">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-xl bg-primary/10 p-3">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Main Properties</p>
                <p className="text-2xl font-semibold">{compsets.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-visible rounded-2xl rounded-md border-muted/50 shadow-md">
        <CardHeader className="border-b bg-white flex items-center flex-row justify-between  rounded-md">
          <div className="flex">
            <CardTitle>CompSet Directory</CardTitle>
          </div>
          <div>
            <Button asChild size="lg" className="gap-2 rounded-xl shadow-sm">
              <Link href="/compsets/new">
                <Plus className="h-4 w-4" />
                Create CompSet
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-visible p-0">
          {compsets.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Main Property</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {compsets.map((compSet) => (
                  <TableRow
                    key={compSet.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="pl-6 text-md font-medium">
                      <Link
                        href={`/compsets/${compSet.id}`}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        {compSet.name}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {compSet.subjectHotel.name}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className="rounded-lg">
                        {
                          compSet.members.filter(
                            (member) => member.roleType === "COMP",
                          ).length
                        }
                        Hotels
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <details name="compset-actions-menu" className="relative inline-block">
                        <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                          <EllipsisVertical className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                          <Link
                            href={`/compsets/${compSet.id}`}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                          <Link
                            href={`/compsets/${compSet.id}/edit`}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </Link>
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10">
              <EmptyState
                title="No CompSets Yet"
                description="Create your first compset and start comparing properties."
                actionHref="/compsets/new"
                actionLabel="Create CompSet"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
