import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createCompSet, listCompSets } from "@/lib/services/compsets";

export async function GET() {
  await requireApiUser();
  const compsets = await listCompSets();
  return NextResponse.json(compsets);
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = await request.json();
    const compset = await createCompSet(payload, user.id);
    return NextResponse.json({ id: compset.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create compset" }, { status: 400 });
  }
}
