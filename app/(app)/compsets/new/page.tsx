import { CompSetForm } from "@/components/forms/compset-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function NewCompSetPage() {
  const hotels = await prisma.hotel.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create manual compset</h1>
        <p className="text-sm text-muted-foreground">Subject property plus manually selected comp properties.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>CompSet setup</CardTitle></CardHeader>
        <CardContent><CompSetForm hotels={hotels} /></CardContent>
      </Card>
    </div>
  );
}
