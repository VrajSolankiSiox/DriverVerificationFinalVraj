import { Buffer } from "buffer";
import PptxGenJS from "pptxgenjs";

import type { ReportViewModel } from "@/lib/reports/sections";
import { formatCurrency, formatNumber } from "@/lib/utils";

type TableCell = { text: string };
function row(...cells: string[]): TableCell[] {
  return cells.map((c) => ({ text: c }));
}

function createLineChartSvg(daily: ReportViewModel["analytics"]["daily"]) {
  const width = 900;
  const height = 320;
  const padding = 36;
  const points = daily.slice(0, 30);
  const values = points.flatMap((point) => [point.subjectRate ?? 0, point.compAverage]);
  const max = Math.max(...values, 1);
  const scaleX = (index: number) => padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
  const scaleY = (value: number) => height - padding - (value / max) * (height - padding * 2);
  const subjectPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(index)} ${scaleY(point.subjectRate ?? 0)}`)
    .join(" ");
  const compPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(index)} ${scaleY(point.compAverage)}`)
    .join(" ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#94a3b8" />
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#94a3b8" />
    <path d="${subjectPath}" fill="none" stroke="#2563eb" stroke-width="3" />
    <path d="${compPath}" fill="none" stroke="#0f172a" stroke-width="3" stroke-dasharray="8 6" />
    <text x="${padding}" y="20" fill="#2563eb" font-size="14">Subject</text>
    <text x="${padding + 120}" y="20" fill="#0f172a" font-size="14">Comp Average</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function createBarChartSvg(viewModel: ReportViewModel) {
  const width = 700;
  const height = 280;
  const padding = 36;
  const subjectWeekday = viewModel.analytics.weekdayWeekend.weekdaySubjectAverage;
  const subjectWeekend = viewModel.analytics.weekdayWeekend.weekendSubjectAverage;
  const compWeekday = viewModel.analytics.weekdayWeekend.weekdayCompAverage;
  const compWeekend = viewModel.analytics.weekdayWeekend.weekendCompAverage;
  const values = [subjectWeekday, subjectWeekend, compWeekday, compWeekend];
  const max = Math.max(...values, 1);
  const chartLeft = 140;
  const chartRight = width - padding;
  const chartWidth = chartRight - chartLeft;
  const barHeight = 22;
  const groupGap = 28;
  const groups = [
    { label: "Weekday", subject: subjectWeekday, comp: compWeekday, y: 62 },
    { label: "Weekend", subject: subjectWeekend, comp: compWeekend, y: 62 + barHeight * 2 + groupGap + 18 },
  ];

  const barLength = (value: number) => (value / max) * chartWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="${chartLeft}" y="24" fill="#1d4ed8" font-size="14">Subject</text>
    <text x="${chartLeft + 110}" y="24" fill="#60a5fa" font-size="14">Comp Average</text>
    ${groups
      .map((group) => {
        const subjectLen = barLength(group.subject);
        const compLen = barLength(group.comp);
        const subjectY = group.y;
        const compY = group.y + barHeight + 6;
        return `<g>
        <text x="36" y="${subjectY + barHeight + 6}" fill="#0f172a" font-size="14">${group.label}</text>
        <rect x="${chartLeft}" y="${subjectY}" width="${subjectLen}" height="${barHeight}" fill="#1d4ed8" rx="6" />
        <rect x="${chartLeft}" y="${compY}" width="${compLen}" height="${barHeight}" fill="#60a5fa" rx="6" />
        <text x="${chartLeft + subjectLen + 8}" y="${subjectY + barHeight - 6}" fill="#1d4ed8" font-size="12">${formatCurrency(group.subject)}</text>
        <text x="${chartLeft + compLen + 8}" y="${compY + barHeight - 6}" fill="#2563eb" font-size="12">${formatCurrency(group.comp)}</text>
      </g>`;
      })
      .join("")}
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function generatePptx(
  viewModel: ReportViewModel,
  visibility: "CLIENT_SAFE" | "INTERNAL_FULL",
  outputPath: string,
) {
  const pptx = new PptxGenJS();
  pptx.author = "OpenAI";
  pptx.company = "Rank Me Now";
  pptx.subject = viewModel.reportName;
  pptx.title = viewModel.reportName;
  pptx.layout = "LAYOUT_WIDE";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
  };

  const summary90 = viewModel.analytics.summariesByWindow["90"];

  const cover = pptx.addSlide();
  cover.background = { color: "F8FAFC" };
  cover.addText(viewModel.reportName, { x: 0.7, y: 0.8, w: 11, h: 0.8, fontSize: 24, bold: true, color: "0F172A" });
  cover.addText(`${viewModel.subjectHotel.name} • ${viewModel.subjectHotel.city}, ${viewModel.subjectHotel.country}`, {
    x: 0.7,
    y: 1.7,
    w: 10,
    h: 0.5,
    fontSize: 14,
    color: "475569",
  });
  cover.addText(`Confidence: ${viewModel.confidenceLevel}`, {
    x: 0.7,
    y: 2.2,
    w: 3.2,
    h: 0.4,
    fontSize: 12,
    color: "2563EB",
    bold: true,
  });

  const exec = pptx.addSlide();
  exec.addText("Executive Summary", { x: 0.5, y: 0.4, w: 5, h: 0.5, fontSize: 20, bold: true });
  exec.addText(viewModel.manualExecutiveSummary || "See application narrative.", {
    x: 0.6,
    y: 1.0,
    w: 6.2,
    h: 2.5,
    fontSize: 14,
    color: "334155",
    breakLine: false,
    valign: "top",
  });
  exec.addTable(
    [
      row("Avg Subject Rate", formatCurrency(summary90.avgSubjectRate)),
      row("Avg Comp Average", formatCurrency(summary90.avgCompAverageRate)),
      row("Avg Rate Index", formatNumber(summary90.avgRateIndex, 2)),
      row("Lowest-Priced Nights", String(summary90.subjectLowestCount)),
      row("Highest-Priced Nights", String(summary90.subjectHighestCount)),
    ],
    { x: 7.3, y: 1.1, w: 5.2, h: 2.8, border: { pt: 1, color: "CBD5E1" }, fill: { color: "FFFFFF" } },
  );

  const comp = pptx.addSlide();
  comp.addText("CompSet Overview", { x: 0.5, y: 0.4, w: 5, h: 0.5, fontSize: 20, bold: true });
  comp.addTable(viewModel.compSet.members.map((member) => row(member.name, member.roleType)), {
    x: 0.6,
    y: 1.1,
    w: 6.5,
    h: 4.5,
    border: { pt: 1, color: "CBD5E1" },
  });
  comp.addText(`CompSet: ${viewModel.compSet.name} (v${viewModel.compSet.version})`, {
    x: 7.5,
    y: 1.2,
    w: 4.6,
    h: 0.5,
    fontSize: 16,
    bold: true,
  });
  comp.addText(`Subject hotel: ${viewModel.subjectHotel.name}`, {
    x: 7.5,
    y: 1.8,
    w: 4.6,
    h: 0.4,
    fontSize: 13,
  });

  const rateSlide = pptx.addSlide();
  rateSlide.addText("90-Day Rate Comparison", { x: 0.5, y: 0.4, w: 5, h: 0.5, fontSize: 20, bold: true });
  rateSlide.addImage({ data: createLineChartSvg(viewModel.analytics.daily), x: 0.6, y: 1.0, w: 8.5, h: 3.2 });
  rateSlide.addImage({ data: createBarChartSvg(viewModel), x: 9.25, y: 1.05, w: 3.5, h: 2.2 });
  rateSlide.addText(`Observed below-comp nights: ${summary90.belowThresholdCount}`, {
    x: 9.3,
    y: 3.5,
    w: 3.1,
    h: 0.4,
    fontSize: 12,
  });
  rateSlide.addText(`Observed above-comp nights: ${summary90.aboveThresholdCount}`, {
    x: 9.3,
    y: 3.9,
    w: 3.1,
    h: 0.4,
    fontSize: 12,
  });

  const website = pptx.addSlide();
  website.addText("Website Audit", { x: 0.5, y: 0.4, w: 5, h: 0.5, fontSize: 20, bold: true });
  const audit = viewModel.websiteAudit;
  website.addTable(
    [
      row("Total Score", String(audit?.scoreTotal ?? "—")),
      row("Direct Booking UX", String(audit?.directBookingUxScore ?? "—")),
      row("Content Completeness", String(audit?.contentCompletenessScore ?? "—")),
      row("Technical Hygiene", String(audit?.technicalHygieneScore ?? "—")),
      row("Offer Visibility", String(audit?.offerVisibilityScore ?? "—")),
      row("Trust / Contact Clarity", String(audit?.trustContactScore ?? "—")),
    ],
    { x: 0.6, y: 1.0, w: 5.3, h: 3.2, border: { pt: 1, color: "CBD5E1" } },
  );
  website.addText((audit?.notes ?? ["No website audit available."]).join("\n"), {
    x: 6.2,
    y: 1.0,
    w: 6.4,
    h: 3.4,
    fontSize: 13,
    color: "334155",
    breakLine: false,
    valign: "top",
  });

  const actions = pptx.addSlide();
  actions.addText("Recommended 30/60/90-Day Actions", { x: 0.5, y: 0.4, w: 6, h: 0.5, fontSize: 20, bold: true });
  actions.addText(
    [
      "30 Days",
      "• Validate pricing guardrails",
      "• Tighten booking CTA placement",
      "• Audit offer exposure",
    ].join("\n"),
    { x: 0.6, y: 1.0, w: 3.8, h: 2.2, fontSize: 14 },
  );
  actions.addText(
    [
      "60 Days",
      "• Refine weekday/weekend merchandising",
      "• Create rate-review cadence",
      "• Close technical hygiene gaps",
    ].join("\n"),
    { x: 4.5, y: 1.0, w: 3.8, h: 2.2, fontSize: 14 },
  );
  actions.addText(
    [
      "90 Days",
      "• Operationalize cross-functional workflow",
      "• Track direct-booking lift",
      "• Expand observation granularity",
    ].join("\n"),
    { x: 8.4, y: 1.0, w: 4.0, h: 2.2, fontSize: 14 },
  );

  if (visibility === "INTERNAL_FULL") {
    const internal = pptx.addSlide();
    internal.addText("Rep Battlecard", { x: 0.5, y: 0.4, w: 4, h: 0.5, fontSize: 20, bold: true });
    internal.addText(
      [
        "Opening Hooks",
        `• ${viewModel.subjectHotel.name} has observable pricing and website execution gaps.`,
        "• This is an outside-in commercial view, not a financial claim.",
      ].join("\n"),
      { x: 0.6, y: 1.0, w: 4.0, h: 2.0, fontSize: 13 },
    );
    internal.addText(
      [
        "Likely Objections",
        "• We already have an RMS",
        "• Public rates do not reflect true business mix",
        "• We do not want another system",
      ].join("\n"),
      { x: 4.7, y: 1.0, w: 4.0, h: 2.0, fontSize: 13 },
    );
    internal.addText(
      [
        "Suggested Flow",
        "• Subject snapshot",
        "• Rate positioning",
        "• Weekend weakness",
        "• Website friction",
        "• Action plan",
      ].join("\n"),
      { x: 8.8, y: 1.0, w: 3.4, h: 2.0, fontSize: 13 },
    );
  }

  await pptx.writeFile({ fileName: outputPath });
}
