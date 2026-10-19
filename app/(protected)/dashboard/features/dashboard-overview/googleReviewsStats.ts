import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type GoogleReviewsStatsPeriod = 'today' | '7d' | '30d' | 'thisMonth'

export type GoogleReviewsDailyStat = {
    date: string
    scans: number
}

export type GoogleReviewsStats = {
    total_scans: number
    unique_visitors_estimated: number
    comparison_percentage: number | null
    comparison_has_previous_data: boolean
    daily: GoogleReviewsDailyStat[]
    meta: {
        timezone: string
    }
}

export type GoogleReviewsStatsResponse = {
    data: GoogleReviewsStats
}

function isGoogleReviewsStatsResponse(value: unknown): value is GoogleReviewsStatsResponse {
    if (!value || typeof value !== 'object' || !('data' in value)) return false
    const stats = value.data
    if (!stats || typeof stats !== 'object') return false
    const candidate = stats as Partial<GoogleReviewsStats>
    return (
        typeof candidate.total_scans === 'number' &&
        Number.isFinite(candidate.total_scans) &&
        typeof candidate.unique_visitors_estimated === 'number' &&
        Number.isFinite(candidate.unique_visitors_estimated) &&
        (candidate.comparison_percentage === null ||
            (typeof candidate.comparison_percentage === 'number' &&
                Number.isFinite(candidate.comparison_percentage))) &&
        typeof candidate.comparison_has_previous_data === 'boolean' &&
        Array.isArray(candidate.daily) &&
        candidate.daily.every(
            (point) =>
                typeof point?.date === 'string' &&
                typeof point.scans === 'number' &&
                Number.isFinite(point.scans),
        ) &&
        typeof candidate.meta?.timezone === 'string' &&
        candidate.meta.timezone.length > 0
    )
}

const credentials = { withCredentials: true }

export async function getGoogleReviewsStats(
    period: GoogleReviewsStatsPeriod,
): Promise<GoogleReviewsStatsResponse> {
    try {
        const response = await apiClient.get<GoogleReviewsStatsResponse>(
            '/businesses/google-reviews/stats',
            { ...credentials, params: { period } },
        )
        if (!isGoogleReviewsStatsResponse(response.data)) {
            throw new Error('Google Reviews stats response is incomplete.')
        }
        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
