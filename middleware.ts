import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RedirectedUrls } from "./src/lib/RedirectUrls";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) =>
      SESSION_COOKIE_NAMES.some(
        (cookieName) => name === cookieName || name.startsWith(`${cookieName}.`),
      ),
    );



  // El middleware solo acelera la redirección; la sesión se valida realmente en el layout server-side.
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL(RedirectedUrls.login, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
