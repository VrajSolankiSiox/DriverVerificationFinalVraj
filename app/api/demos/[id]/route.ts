import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getDemoSession, updateDemoSession } from "@/lib/services/demos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireApiUser();
  const { id } = await params;
  const row = await getDemoSession(id);
  if (!row) {
    return NextResponse.json({ error: "Demo record not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = await request.json();
    const actorName = user.name || user.email || "Unknown";
    const updated = await updateDemoSession(
      {
        ...payload,
        id,
        conductedBy:
          typeof payload?.conductedBy === "string" && payload.conductedBy.trim().length > 0
            ? payload.conductedBy
            : actorName,
      },
      user.id,
    );
    return NextResponse.json({ id: updated.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update demo record" },
      { status: 400 },
    );
  }
}
