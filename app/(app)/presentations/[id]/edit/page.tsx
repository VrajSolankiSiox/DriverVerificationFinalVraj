import { notFound } from "next/navigation";

import { PresentationEditor } from "@/components/presentations/presentation-editor";
import { presentationSlideDefinitions } from "@/lib/presentations/slides";
import { getPresentationById } from "@/lib/services/presentations";

export default async function EditPresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const presentation = await getPresentationById(id);
  if (!presentation) {
    notFound();
  }

  return (
    <PresentationEditor
      presentation={{
        id: presentation.id,
        name: presentation.name,
        reportTitleOverride: presentation.reportTitleOverride,
        slideTitlesJson: (presentation.slideTitlesJson as Record<string, string> | null) ?? {},
      }}
      reportId={presentation.report.id}
      slides={presentationSlideDefinitions}
    />
  );
}
