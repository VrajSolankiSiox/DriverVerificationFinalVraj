import { DemoForm } from "@/components/demo/demo-form";

export default function NewDemoPage() {
  return (
    <DemoForm
      title="Add Demo"
      submitLabel="Create Demo"
      endpoint="/api/demos"
      method="POST"
    />
  );
}
