import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { runReviewSnapshot } from "@/lib/services/reviews";
import { env } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id: hotelId } = await params;
    if (!hotelId) {
      return NextResponse.json({ error: "Hotel ID is required" }, { status: 400 });
    }
    await runReviewSnapshot(hotelId, user.id);
    return NextResponse.redirect(new URL(`/hotels/${hotelId}`, env.APP_BASE_URL));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run review snapshot" },
      { status: 400 },
    );
  }
}
