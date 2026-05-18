import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; screenshotId: string }> },
) {
  try {
    await requireApiUser();
    const { id: hotelId, screenshotId } = await params;

    // Verify the snapshot belongs to this hotel
    const snapshot = await prisma.reviewSnapshot.findUnique({
      where: { id: screenshotId },
      select: { id: true, hotelId: true },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
    }
    if (snapshot.hotelId !== hotelId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.reviewSnapshot.delete({ where: { id: screenshotId } });
    revalidatePath(`/hotels/${hotelId}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[review-screenshot DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete." }, { status: 500 });
  }
}
