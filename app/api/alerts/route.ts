import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getActiveAlerts } from "@/lib/services/alerts";

export async function GET(request: Request) {
  try {
    await requireApiUser();
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get("hotelId") ?? undefined;
    const reportId = searchParams.get("reportId") ?? undefined;
    const alerts = await getActiveAlerts({ hotelId, reportId });
    return NextResponse.json({ alerts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch alerts" },
      { status: 401 },
    );
  }
}
