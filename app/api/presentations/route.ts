import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createPresentationForReport } from "@/lib/services/presentations";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = (await request.json()) as { reportId?: string };
    const reportId = String(payload.reportId ?? "").trim();
    if (!reportId) {
      return NextResponse.json({ error: "reportId is required." }, { status: 400 });
    }

    const created = await createPresentationForReport(reportId, user.id);
    return NextResponse.json({ id: created.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create presentation" }, { status: 400 });
  }
}
