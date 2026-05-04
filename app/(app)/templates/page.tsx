import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listMappingTemplates } from "@/lib/services/uploads";
import { formatDate } from "@/lib/utils";

export default async function TemplatesPage() {
  const templates = await listMappingTemplates();
  return (
    <div className="space-y-8 p-6">
      <Card className="rounded-2xl border-muted/50 shadow-md">
        <CardHeader className="border-b bg-white flex items-center flex-row justify-between">
          <div className="flex">
            <CardTitle>Mapping Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="pl-6 text-md font-medium">{template.name}</TableCell>
                  <TableCell>{template.sourceName}</TableCell>
                  <TableCell>{template.lastUsedAt ? formatDate(template.lastUsedAt) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
