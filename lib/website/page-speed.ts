export type PageSpeedResult = {
  available: boolean;
  notes: string[];
};

export async function getPageSpeedPlaceholder(): Promise<PageSpeedResult> {
  return {
    available: false,
    notes: [
      "Page speed adapter is intentionally stubbed for MVP. Connect a paid API or Lighthouse worker behind a feature flag when needed.",
    ],
  };
}
