import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Adding unresolved hotels is disabled. Please manage compset hotels manually." },
    { status: 403 },
  );
}

