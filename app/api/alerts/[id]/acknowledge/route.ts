import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { acknowledgeAlert } from "@/lib/services/alerts";
import { env } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Alert ID is required" }, { status: 400 });
    }
    await acknowledgeAlert(id, user.id);
    const referer = request.headers.get("referer");
    if (referer) {
      return NextResponse.redirect(referer, 303);
    }
    return NextResponse.redirect(new URL("/dashboard", env.APP_BASE_URL), 303);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to acknowledge alert" },
      { status: 400 },
    );
  }
}
