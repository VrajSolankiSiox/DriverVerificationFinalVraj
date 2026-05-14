import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { ReportViewModel } from "@/lib/reports/sections";
import { buildReportSections } from "@/lib/reports/sections";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderList(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderReportHtml(viewModel: ReportViewModel, visibility: "CLIENT_SAFE" | "INTERNAL_FULL") {
  const sections = buildReportSections(viewModel).filter(
    (section) => section.enabled && (visibility === "INTERNAL_FULL" || section.visibility === "CLIENT_SAFE"),
  );
  const summary90 = viewModel.analytics.summariesByWindow["90"];
  const compMembersWithExpedia = viewModel.compSet.members
    .filter((member) => member.roleType === "COMP")
    .map((member) => ({
      name: member.name,
      expediaRating: member.otaRatings?.Expedia,
    }));
  const compExpediaRatings = compMembersWithExpedia
    .map((member) => Number(member.expediaRating))
    .filter((value) => Number.isFinite(value));
  const avgCompExpediaRating = compExpediaRatings.length
    ? compExpediaRatings.reduce((sum, value) => sum + value, 0) / compExpediaRatings.length
    : null;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(viewModel.reportName)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; }
      .page { max-width: 1120px; margin: 0 auto; }
      .hero { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: white; }
      h1 { font-size: 30px; margin-bottom: 4px; }
      h2 { margin-top: 32px; font-size: 22px; }
      h3 { margin-top: 18px; font-size: 16px; }
      p, li { font-size: 13px; line-height: 1.55; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
      .muted { color: #475569; }
      .pill { display: inline-block; border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 4px 8px; font-size: 11px; }
      .opportunity { margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hero">
        <div class="pill">${escapeHtml(viewModel.status)}</div>
        <h1>${escapeHtml(viewModel.reportName)}</h1>
        <p>${escapeHtml(viewModel.subjectHotel.name)} • ${escapeHtml(viewModel.subjectHotel.city)}, ${escapeHtml(viewModel.subjectHotel.country)}</p>
        <p class="muted">Generated ${escapeHtml(formatDate(new Date(), "dd MMM yyyy, HH:mm"))} • Confidence ${escapeHtml(viewModel.confidenceLevel)}</p>
      </div>

      <section>
        <h2>Executive Summary</h2>
        <p>${escapeHtml(String((sections.find((section) => section.type === "EXECUTIVE_SUMMARY")?.content.text ?? "")))}</p>
      </section>

      <section>
        <h2>Competitive Performance Snapshot</h2>
        <table>
          <thead><tr><th>Metric</th><th>You</th><th>Comp Avg</th><th>Rank</th><th>Verdict</th></tr></thead>
          <tbody>
            ${((sections.find((section) => section.type === "COMPETITIVE_GAP_SUMMARY")?.content.gaps as Array<{ metric: string; subjectValue: string | number; compAverage: string | number | null; rank: string | null; verdict: string }>) ?? []).map((g) => `
              <tr>
                <td>${escapeHtml(g.metric)}</td>
                <td>${escapeHtml(String(g.subjectValue))}</td>
                <td>${g.compAverage != null ? escapeHtml(String(g.compAverage)) : "—"}</td>
                <td>${g.rank != null ? escapeHtml(g.rank) : "—"}</td>
                <td>${escapeHtml(g.verdict)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Rate Positioning Snapshot</h2>
        <div class="grid">
          <div class="card"><strong>Avg Subject Rate</strong><p>${escapeHtml(formatCurrency(summary90.avgSubjectRate))}</p></div>
          <div class="card"><strong>Avg Comp Average</strong><p>${escapeHtml(formatCurrency(summary90.avgCompAverageRate))}</p></div>
          <div class="card"><strong>Avg Rate Index</strong><p>${escapeHtml(formatNumber(summary90.avgRateIndex, 2))}</p></div>
          <div class="card"><strong>Lowest-Priced Nights</strong><p>${summary90.subjectLowestCount}</p></div>
          <div class="card"><strong>Highest-Priced Nights</strong><p>${summary90.subjectHighestCount}</p></div>
          <div class="card"><strong>Median Gap</strong><p>${escapeHtml(formatCurrency(summary90.medianGap))}</p></div>
        </div>
      </section>

      <section>
        <h2>CompSet</h2>
        <table>
          <thead><tr><th>Property</th><th>Role</th></tr></thead>
          <tbody>
            ${viewModel.compSet.members.map((member) => `<tr><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.roleType)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>OTA Rating Comparison (Expedia)</h2>
        <p><strong>CompSet Expedia average:</strong> ${avgCompExpediaRating != null ? escapeHtml(formatNumber(avgCompExpediaRating, 2)) : "—"}</p>
        <table>
          <thead><tr><th>Competitor</th><th>Expedia Rating</th></tr></thead>
          <tbody>
            ${compMembersWithExpedia.map((member) => `<tr><td>${escapeHtml(member.name)}</td><td>${member.expediaRating !== undefined && member.expediaRating !== "" ? escapeHtml(String(member.expediaRating)) : "—"}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Outlier Nights</h2>
        <table>
          <thead><tr><th>Date</th><th>Subject Rate</th><th>Comp Average</th><th>Gap</th></tr></thead>
          <tbody>
            ${viewModel.analytics.outlierNights.map((night) => `<tr><td>${escapeHtml(night.date)}</td><td>${escapeHtml(formatCurrency(night.subjectRate))}</td><td>${escapeHtml(formatCurrency(night.compAverage))}</td><td>${escapeHtml(formatCurrency(night.gap))}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Website Audit</h2>
        ${viewModel.websiteAudit ? `
          <div class="grid">
            <div class="card"><strong>Total Score</strong><p>${viewModel.websiteAudit.scoreTotal ?? "—"}</p></div>
            <div class="card"><strong>SEO Score</strong><p>${viewModel.websiteAudit.seoScoreTotal ?? "—"}</p></div>
            <div class="card"><strong>Direct Booking UX</strong><p>${viewModel.websiteAudit.directBookingUxScore ?? "—"}</p></div>
            <div class="card"><strong>Content Completeness</strong><p>${viewModel.websiteAudit.contentCompletenessScore ?? "—"}</p></div>
            <div class="card"><strong>Technical Hygiene</strong><p>${viewModel.websiteAudit.technicalHygieneScore ?? "—"}</p></div>
            <div class="card"><strong>Offer Visibility</strong><p>${viewModel.websiteAudit.offerVisibilityScore ?? "—"}</p></div>
            <div class="card"><strong>Trust / Contact Clarity</strong><p>${viewModel.websiteAudit.trustContactScore ?? "—"}</p></div>
          </div>
          ${renderList(viewModel.websiteAudit.notes)}
        ` : "<p>No website audit has been run yet.</p>"}
      </section>

      <section>
        <h2>Review Comparison</h2>
        ${viewModel.reviewSnapshots?.subject?.length || viewModel.reviewSnapshots?.comps?.some((c) => c.snapshots.length) ? `
          <table>
            <thead><tr><th>Property</th><th>Source</th><th>Rating</th><th>Count</th></tr></thead>
            <tbody>
              ${(viewModel.reviewSnapshots?.subject ?? []).map((s) => `<tr><td><strong>${escapeHtml(viewModel.subjectHotel.name)}</strong></td><td>${escapeHtml(s.source)}</td><td>${s.averageRating.toFixed(1)}</td><td>${s.reviewCount}</td></tr>`).join("")}
              ${(viewModel.reviewSnapshots?.comps ?? []).flatMap((c) => (c.snapshots ?? []).map((s) => `<tr><td>${escapeHtml(c.hotelName)}</td><td>${escapeHtml(s.source)}</td><td>${s.averageRating.toFixed(1)}</td><td>${s.reviewCount}</td></tr>`)).join("")}
            </tbody>
          </table>
        ` : "<p>No review snapshots yet. Run review snapshots on hotels to compare.</p>"}
      </section>

      <section>
        <h2>SEO Findings</h2>
        ${viewModel.websiteAudit?.seoFindings?.length || viewModel.seoAudit?.notes?.length ? `
          <p><strong>SEO Score:</strong> ${viewModel.websiteAudit?.seoScoreTotal ?? viewModel.seoAudit?.total ?? "—"}</p>
          ${renderList(viewModel.websiteAudit?.seoFindings ?? viewModel.seoAudit?.notes ?? [])}
        ` : "<p>No SEO audit data yet. Run a website audit to capture SEO findings.</p>"}
      </section>

      <section>
        <h2>Opportunity Buckets</h2>
        ${(sections.find((section) => section.type === "OPPORTUNITY_BUCKETS")?.content.items as Array<{ title: string; confidence: string; description: string; range: string }> | undefined)?.map((item) => `
          <div class="card opportunity">
            <strong>${escapeHtml(item.title)}</strong>
            <p class="muted">Range: ${escapeHtml(item.range)} • Confidence: ${escapeHtml(item.confidence)}</p>
            <p>${escapeHtml(item.description)}</p>
          </div>`).join("")}
      </section>

      ${visibility === "INTERNAL_FULL" ? `
      <section>
        <h2>Internal Battlecard</h2>
        <div class="grid">
          <div class="card"><h3>Opening Hooks</h3>${renderList((sections.find((section) => section.type === "BATTLECARD")?.content.openingHooks as string[]) ?? [])}</div>
          <div class="card"><h3>Observed Issues</h3>${renderList((sections.find((section) => section.type === "BATTLECARD")?.content.observedIssues as string[]) ?? [])}</div>
          <div class="card"><h3>Discovery Questions</h3>${renderList((sections.find((section) => section.type === "BATTLECARD")?.content.discoveryQuestions as string[]) ?? [])}</div>
        </div>
      </section>` : ""}

    </div>
  </body>
</html>`;
}
