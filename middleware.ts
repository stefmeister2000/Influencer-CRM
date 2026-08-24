import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "orvion_session";

// Lightweight gate: checks for the session cookie's presence only. Full HMAC
// verification + user lookup happens server-side in requireSession().
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(COOKIE)?.value);
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login");

  if (!hasSession && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
