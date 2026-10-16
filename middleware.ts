import { NextResponse, type NextRequest } from "next/server";

/**
 * Coarse gate for the admin area: without a session cookie, visitors are sent to
 * the login page. Real authorisation (session validity, role) is enforced on the
 * server in every admin page, server action and API route.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname === "/admin/login" || pathname === "/admin/setup";
  if (!open && !req.cookies.get("leman_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
