import { cookies } from 'next/headers'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { RedirectedUrls } from '@/src/lib/RedirectUrls'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const API_URL = BACKEND_URL.endsWith('/api/v1')
    ? BACKEND_URL
    : `${BACKEND_URL.replace(/\/$/, '')}/api/v1`

type BusinessResponse = {
    business?: Record<string, unknown> | null
    error?: { code?: unknown }
    result?: string
}

function hasBusiness(value: unknown): value is { business: Record<string, unknown> } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'business' in value &&
        typeof value.business === 'object' &&
        value.business !== null
    )
}

function hasBusinessNotFoundCode(value: BusinessResponse) {
    if (value.error && value.error.code === 'BUSINESS_NOT_FOUND') return true
    if (typeof value.result !== 'string') return false

    try {
        const result = JSON.parse(value.result) as BusinessResponse
        return result.error?.code === 'BUSINESS_NOT_FOUND'
    } catch {
        return false
    }
}

export const getCurrentBusiness = cache(async () => {
    const cookieHeader = (await cookies()).toString()

    try {
        const response = await fetch(`${API_URL}/businesses/mine`, {
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
            cache: 'no-store',
        })
        const body = (await response.json().catch(() => ({}))) as BusinessResponse

        return {
            business: hasBusiness(body) ? body.business : null,
            exists: hasBusiness(body) && !hasBusinessNotFoundCode(body),
            unavailable: !response.ok && response.status >= 500,
        }
    } catch {
        return { business: null, exists: true, unavailable: true }
    }
})

export async function requireCurrentBusiness() {
    const currentBusiness = await getCurrentBusiness()

    if (!currentBusiness.exists && !currentBusiness.unavailable) {
        redirect(`${RedirectedUrls.createMenu}?notice=business-required`)
    }

    return currentBusiness
}
