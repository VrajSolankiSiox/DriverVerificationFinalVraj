import type { RateAnalyticsResult } from "@/lib/analytics/rate-analytics";

export function buildBattlecard(input: {
  subjectHotelName: string;
  compNames: string[];
  analytics: RateAnalyticsResult;
  websiteAuditScore?: number | null;
}) {
  const weakest = input.analytics.outlierNights[0];
  const compLabel = input.compNames.slice(0, 3).join(", ");

  return {
    openingHooks: [
      `Your comps (${compLabel}) are outperforming you on pricing and website execution—here's what we see.`,
      `You're leaving money on the table: public rate gaps and website friction are measurable.`,
      `This is not a revenue estimate—it's a practical view of where you're losing to competitors.`,
    ],
    observedIssues: [
      `Your pricing ranked lowest on ${input.analytics.rankDistribution.lowest} nights and highest on ${input.analytics.rankDistribution.highest}—inconsistent vs comps.`,
      `${input.analytics.missingRateNights.length} nights with no observed rate—comps may be winning those dates.`,
      `Your weekend pricing trails weekday—you're underperforming when demand is high.`,
      `Outlier gaps of up to $${weakest ? Math.round(weakest.gap) : "0"} vs compset average.`,
      `Your site scores ${input.websiteAuditScore ?? "N/A"}/100—guests are bouncing to comps.`,
    ],
    discoveryQuestions: [
      "What do you think is costing you when guests choose a comp over you?",
      "How do you decide when to move above or below competitors?",
      "How often are booking CTAs and offers updated?",
      "When demand spikes, what process decides if rates move faster?",
      "Where do you feel blind on direct-booking conversion?",
    ],
    likelyObjections: [
      "We already have an RMS.",
      "Public rates do not reflect our true business mix.",
      "Website issues are minor compared with pricing strategy.",
      "We do not want another complex system to manage."
    ],
    rebuttalIdeas: [
      "Your comps are doing X; you're not. That gap is measurable.",
      "Acknowledge public-rate limits—pivot to pattern visibility and actionability.",
      "Tie website findings to direct-booking friction, not aesthetics.",
      "Lead with workflow simplicity and measurable next steps.",
    ],
    suggestedDemoFlow: [
      "Start with the subject snapshot and compset framing.",
      "Move to 90-day rate positioning and outlier nights.",
      "Transition into weekday/weekend behavior and confidence level.",
      "Show website audit findings tied to direct-booking friction.",
      "Close with the 30/60/90-day action plan and a follow-up motion."
    ],
    followUpEmailDraft: `Subject: Follow-up on ${input.subjectHotelName} pricing and website observations

Thanks again for the conversation. We reviewed publicly observable pricing patterns and first-party website signals for ${input.subjectHotelName}. The clearest takeaways were pricing inconsistency on selected near-term dates, a weaker weekend stance versus weekday positioning, and several website conversion opportunities. None of this is presented as a substitute for your internal systems; it is intended as a practical outside-in view to help prioritize next steps. If useful, we can walk your team through the top 30/60/90-day actions and the workflow required to operationalize them.`
  };
}
