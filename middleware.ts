import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RedirectedUrls } from './src/lib/RedirectUrls'

const SESSION_COOKIE_NAMES = [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
] as const

function redirectToLogin(request: NextRequest) {
    return NextResponse.redirect(new URL(RedirectedUrls.login, request.url))
}

export function middleware(request: NextRequest) {
    const hasSessionCookie = request.cookies
        .getAll()
        .some(({ name }) =>
            SESSION_COOKIE_NAMES.some(
                (cookieName) => name === cookieName || name.startsWith(`${cookieName}.`),
            ),
        )

    if (!hasSessionCookie) {
        return redirectToLogin(request)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/create-menu/:path*', '/settings/:path*', '/orders/:path*'],
}
