import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { runWebsiteAudit } from "@/lib/services/website-audit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const contentType = request.headers.get("content-type") || "";
    let hotelId = "";
    if (contentType.includes("application/json")) {
      const payload = await request.json();
      hotelId = String(payload?.hotelId ?? "").trim();
    } else {
      const formData = await request.formData();
      hotelId = String(formData.get("hotelId") ?? "").trim();
    }
    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 });
    }
    await runWebsiteAudit(hotelId, user.id);
    return NextResponse.redirect(new URL(`/hotels/${hotelId}`, request.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to run website audit" }, { status: 400 });
  }
}
