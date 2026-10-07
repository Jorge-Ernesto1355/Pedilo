import type { NextResponse } from 'next/server'

const AUTH_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token']

function isPediloHost(requestUrl: string) {
    const hostname = new URL(requestUrl).hostname
    return hostname === 'pedilo.mx' || hostname.endsWith('.pedilo.mx')
}

export function clearAuthCookies(response: NextResponse, requestUrl: string) {
    const domain = isPediloHost(requestUrl) ? '; Domain=pedilo.mx' : ''
    const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : ''

    for (const name of AUTH_COOKIE_NAMES) {
        response.headers.append(
            'set-cookie',
            `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${domain}; HttpOnly; SameSite=Lax${secure}`,
        )
    }
}

export function appendBackendCookies(
    response: NextResponse,
    backendResponse: Response,
    requestUrl: string,
) {
    const domain = isPediloHost(requestUrl) ? '; Domain=pedilo.mx' : ''
    const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : ''

    for (const setCookie of backendResponse.headers.getSetCookie()) {
        let cookie = setCookie
            .replace(/;\s*Domain=[^;]*/gi, '')
            .replace(/;\s*Path=[^;]*/i, '')
            .replace(/;\s*Secure/gi, '')

        cookie += `; Path=/${domain}`
        if (secure && !/;\s*Secure/i.test(cookie)) cookie += secure
        response.headers.append('set-cookie', cookie)
    }
}
