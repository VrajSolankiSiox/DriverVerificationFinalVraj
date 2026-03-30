import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WebsiteScoreCards({
  audit,
}: {
  audit: {
    scoreTotal: number | null;
    directBookingUxScore: number | null;
    contentCompletenessScore: number | null;
    technicalHygieneScore: number | null;
    offerVisibilityScore: number | null;
    trustContactScore: number | null;
    notes: string[];
  } | null;
}) {
  if (!audit) {
    return <p className="text-sm text-muted-foreground">No website audit available yet.</p>;
  }

  const items = [
    ["Total", audit.scoreTotal],
    ["Direct Booking UX", audit.directBookingUxScore],
    ["Content Completeness", audit.contentCompletenessScore],
    ["Technical Hygiene", audit.technicalHygieneScore],
    ["Offer Visibility", audit.offerVisibilityScore],
    ["Trust / Contact", audit.trustContactScore],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{value ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
        {audit.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
