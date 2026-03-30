import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { listHotels, createHotel } from "@/lib/services/hotels";

export async function GET() {
  await requireApiUser();
  const hotels = await listHotels();
  return NextResponse.json(hotels);
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const payload = await request.json();
    const hotel = await createHotel(payload, user.id);
    return NextResponse.json({ id: hotel.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create hotel" }, { status: 400 });
  }
}
