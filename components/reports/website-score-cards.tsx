import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tileStyles = [
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
  "from-white via-slate-50 to-sky-50/60 border-sky-100",
];

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
    return <p className="text-sm text-slate-500">No website audit available yet.</p>;
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
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value], index) => (
          <Card
            key={label}
            className={`border bg-gradient-to-br shadow-[0_18px_44px_-30px_rgba(15,23,42,0.2)] ${tileStyles[index % tileStyles.length]}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-semibold tracking-tight text-slate-950">{value ?? "-"}</div>
              <div className="text-sm text-slate-600">Audit score out of 100</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {audit.notes.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notes</div>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {audit.notes.map((note) => (
              <li key={note} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
