import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { updateHotel, HotelNameAlreadyExistsError } from "@/lib/services/hotels";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const payload = await request.json();
    const hotel = await updateHotel(id, payload, user.id);
    return NextResponse.json({ id: hotel.id });
  } catch (error) {
    if (error instanceof HotelNameAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hotel" },
      { status: 400 },
    );
  }
}
