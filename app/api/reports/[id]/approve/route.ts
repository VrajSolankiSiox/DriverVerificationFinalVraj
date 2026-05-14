import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth";
import { approveReport } from "@/lib/services/reports";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole("ADMIN");
    const { id } = await params;
    const report = await approveReport(id, user.id, user.role);
    return NextResponse.json({ id: report?.id ?? id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to approve report" }, { status: 400 });
  }
}
