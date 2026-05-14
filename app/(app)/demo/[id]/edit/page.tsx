import { notFound } from "next/navigation";

import { DemoForm } from "@/components/demo/demo-form";
import { mapDemoToFormValues } from "@/lib/demo/form-values";
import { getDemoSession } from "@/lib/services/demos";

export default async function EditDemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demo = await getDemoSession(id);
  if (!demo) {
    notFound();
  }

  return (
    <DemoForm
      title="Edit Demo"
      submitLabel="Update Demo"
      endpoint={`/api/demos/${id}`}
      method="PUT"
      initialValues={mapDemoToFormValues(demo)}
    />
  );
}
