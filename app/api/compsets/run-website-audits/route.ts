import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { runDraftCompetitorWebsiteAudits } from "@/lib/services/compsets";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = await request.json();
    const result = await runDraftCompetitorWebsiteAudits(
      {
        compHotels: Array.isArray(payload?.compHotels) ? payload.compHotels : [],
      },
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run website audits" },
      { status: 400 },
    );
  }
}
