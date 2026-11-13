import { getBackendUrl } from '@/lib/auth/config'
import { NextResponse } from 'next/server'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const noStore = { 'Cache-Control': 'no-store, max-age=0' }

    if (!TOKEN_PATTERN.test(token)) {
        return NextResponse.json(
            { error: { code: 'PUBLIC_QR_NOT_FOUND', message: 'QR code not found' } },
            { status: 404, headers: noStore },
        )
    }

    try {
        const response = await fetch(
            `${getBackendUrl()}/api/v1/public/qr/${encodeURIComponent(token)}`,
            { cache: 'no-store' },
        )
        if (!response.ok) {
            return NextResponse.json(
                { error: { code: 'PUBLIC_QR_NOT_FOUND', message: 'QR code not found' } },
                { status: response.status === 404 ? 404 : 502, headers: noStore },
            )
        }

        const body = (await response.json()) as { slug?: unknown }
        if (typeof body.slug !== 'string' || !body.slug) {
            return NextResponse.json(
                { error: { code: 'PUBLIC_QR_NOT_FOUND', message: 'QR code not found' } },
                { status: 404, headers: noStore },
            )
        }

        return NextResponse.redirect(new URL(`/${encodeURIComponent(body.slug)}`, request.url), {
            status: 307,
            headers: noStore,
        })
    } catch {
        return NextResponse.json(
            { error: { code: 'PUBLIC_QR_UNAVAILABLE', message: 'QR redirect unavailable' } },
            { status: 502, headers: noStore },
        )
    }
}
