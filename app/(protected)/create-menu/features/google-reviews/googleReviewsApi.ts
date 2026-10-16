import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { GoogleReviewsResponse } from './googleReviews.types'

const credentials = { withCredentials: true }

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
