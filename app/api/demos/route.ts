import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createDemoSession, listDemoSessions } from "@/lib/services/demos";

export async function GET() {
  await requireApiUser();
  const rows = await listDemoSessions();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = await request.json();
    const actorName = user.name || user.email || "Unknown";
    const created = await createDemoSession(
      {
        ...payload,
        conductedBy:
          typeof payload?.conductedBy === "string" && payload.conductedBy.trim().length > 0
            ? payload.conductedBy
            : actorName,
      },
      user.id,
    );
    return NextResponse.json({ id: created.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create demo record" }, { status: 400 });
  }
}
