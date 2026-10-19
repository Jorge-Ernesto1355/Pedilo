import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import { getBackendUrl } from '@/lib/auth/config'
import type { GoogleReviewsResponse } from './googleReviews.types'

const credentials = { withCredentials: true }

export function getGoogleReviewTrackingUrl(qrCode: string) {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(qrCode)) return ''

    const backendOrigin = getBackendUrl()
        .replace(/\/api\/v1\/?$/, '')
        .replace(/\/$/, '')
    return `${backendOrigin}/r/${encodeURIComponent(qrCode)}`
}

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function getGoogleReviews() {
    return request(() =>
        apiClient.get<GoogleReviewsResponse>('/businesses/google-reviews', credentials),
    )
}

export function saveGoogleReviewUrl(url: string) {
    return request(() =>
        apiClient.put<GoogleReviewsResponse>('/businesses/google-reviews', { url }, credentials),
    )
}
