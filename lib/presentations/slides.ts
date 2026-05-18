export type PresentationSlideDefinition = {
  id: string;
  title: string;
  editable: boolean;
};

export const presentationSlideDefinitions: PresentationSlideDefinition[] = [
  { id: "cover", title: "Report Introduction", editable: true },
  { id: "competitorSelection", title: "Select Competitor Hotels", editable: false },
  { id: "summary", title: "Executive Summary", editable: true },
  { id: "pricingTrends", title: "Hotel-by-Hotel Rate Comparison", editable: true },
  { id: "compSnapshot", title: "Competitive Gap Snapshot", editable: true },
  { id: "mixAndRank", title: "Weekday/Weekend and Rating Distribution", editable: true },
  { id: "website", title: "Website Audit Signals", editable: true },
  { id: "ota", title: "OTA Reputation Comparison", editable: true },
  { id: "reviewResponses", title: "Review Response Evidence", editable: true },
  { id: "ownerFeedback", title: "Owner Feedback", editable: true },
];
