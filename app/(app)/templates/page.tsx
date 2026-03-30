import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listMappingTemplates } from "@/lib/services/uploads";
import { formatDate } from "@/lib/utils";

export default async function TemplatesPage() {
  const templates = await listMappingTemplates();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">Reusable upload mapping templates by source.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Upload mapping templates</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Source</TableHead><TableHead>Last Used</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.name}</TableCell>
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
