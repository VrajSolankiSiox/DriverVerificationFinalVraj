import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { refreshReport, updateReport } from "@/lib/services/reports";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = await request.json();
    const report = await updateReport({ ...payload, reportId: id }, user.id, user.role);
    return NextResponse.json({ id: report?.id ?? id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update report" }, { status: 400 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    await refreshReport(id, user.id);
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to refresh report" }, { status: 400 });
  }
}
