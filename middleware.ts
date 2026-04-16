import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/dashboard",
  "/hotels",
  "/compsets",
  "/uploads",
  "/reports",
  "/exports",
  "/templates",
  "/settings",
  "/api/hotels",
  "/api/compsets",
  "/api/uploads",
  "/api/reports",
  "/api/exports",
  "/api/website-audits",
];

const adminPrefixes = ["/settings"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (adminPrefixes.some((prefix) => pathname.startsWith(prefix)) && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|rank-me-now-mark.svg).*)"],
};
