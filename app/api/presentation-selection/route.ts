import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const reportId = String(formData.get("reportId") ?? "").trim();
  const demo = String(formData.get("demo") ?? "").trim();
  const selectedComps = formData.getAll("comps").map((value) => String(value).trim()).filter(Boolean);

  if (!reportId) {
    return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
  }

  const redirectUrl = new URL(`/reports/${reportId}/present`, request.url);
  if (demo) {
    redirectUrl.searchParams.set("demo", demo);
  }

  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set(`present_comps_${reportId}`, selectedComps.join(","), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

