import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createReport, listReports } from "@/lib/services/reports";

export async function GET() {
  await requireApiUser();
  const reports = await listReports();
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = await request.json();
    const result = await createReport(payload, user.id);
    return NextResponse.json({ id: result.report.id, warning: result.warning ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create report" }, { status: 400 });
  }
}
