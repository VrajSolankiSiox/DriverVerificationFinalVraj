import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { listHotels, createHotel, HotelNameAlreadyExistsError } from "@/lib/services/hotels";

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
    if (error instanceof HotelNameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create hotel" },
      { status: 400 },
    );
  }
}
