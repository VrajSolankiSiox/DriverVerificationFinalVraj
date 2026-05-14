import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { markDemoConductedFromReport } from "@/lib/services/demos";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = (await request.json()) as { reportId?: string; hotelId?: string };
    if (!payload.reportId || !payload.hotelId) {
      return NextResponse.json({ error: "reportId and hotelId are required." }, { status: 400 });
    }
    const name = user.name || user.email || "Unknown";
    const updated = await markDemoConductedFromReport(
      { reportId: payload.reportId, hotelId: payload.hotelId },
      name,
      user.id,
    );
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark demo as conducted" },
      { status: 400 },
    );
  }
}
