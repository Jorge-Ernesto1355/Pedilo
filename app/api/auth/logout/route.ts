import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/auth/config'
import { appendBackendCookies, clearAuthCookies } from '../session-cookies'

export async function POST(request: Request) {
    const response = new NextResponse(null, { status: 204 })
    clearAuthCookies(response, request.url)

    try {
        const cookie = request.headers.get('cookie')
        const backendResponse = await fetch(`${getBackendUrl()}/api/v1/auth/logout`, {
            method: 'POST',
            headers: cookie ? { cookie } : undefined,
            cache: 'no-store',
        })
        appendBackendCookies(response, backendResponse, request.url)
    } catch {
        // The local session is still cleared even if the upstream is unavailable.
    }

    return response
}
