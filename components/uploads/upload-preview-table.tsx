import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function UploadPreviewTable({ rows }: { rows: Record<string, string>[] }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return (
    <div className="overflow-x-auto rounded-b-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-white">
            {headers.map((header) => (
              <TableHead key={header} className={headers.indexOf(header) === 0 ? "pl-6" : ""}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index} className="transition-colors hover:bg-muted/40">
              {headers.map((header) => (
                <TableCell key={header} className={headers.indexOf(header) === 0 ? "pl-6 font-medium" : ""}>{row[header]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
