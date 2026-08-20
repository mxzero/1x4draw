import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    if (req.nextUrl.pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/play", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/play",
    "/play/:path*",
    "/history",
    "/history/:path*",
    "/wallet",
    "/wallet/:path*",
    "/subscribe",
    "/subscribe/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
