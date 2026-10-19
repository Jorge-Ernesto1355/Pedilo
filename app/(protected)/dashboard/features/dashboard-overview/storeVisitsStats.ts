import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type StoreVisitsPeriod = 'today' | '7d' | '30d' | 'thisMonth'

export type StoreVisitSeriesPoint = {
    label: string
    visits: number
}

export type StoreVisitSeriesGranularity = 'hour' | 'day'

export type StoreVisitsStats = {
    total_visits: number
    unique_visitors_estimated: number
    comparison: {
        percentage_change: number | null
        direction: 'up' | 'down' | 'flat' | 'unavailable'
        has_previous_data: boolean
    }
    series: {
        granularity: StoreVisitSeriesGranularity
        current: StoreVisitSeriesPoint[]
        previous: StoreVisitSeriesPoint[]
    }
    meta: {
        timezone: string
    }
}

export type StoreVisitsStatsResponse = {
    data: StoreVisitsStats
}

function isVisitSeries(value: unknown): value is StoreVisitSeriesPoint[] {
    return (
        Array.isArray(value) &&
        value.every(
            (point) =>
                point !== null &&
                typeof point === 'object' &&
                typeof point.label === 'string' &&
                point.label.length > 0 &&
                typeof point.visits === 'number' &&
                Number.isFinite(point.visits) &&
                point.visits >= 0,
        )
    )
}

function isStoreVisitsStatsResponse(value: unknown): value is StoreVisitsStatsResponse {
    if (!value || typeof value !== 'object' || !('data' in value)) return false
    const stats = value.data
    if (!stats || typeof stats !== 'object') return false
    const candidate = stats as Partial<StoreVisitsStats>
    const comparison = candidate.comparison
    const series = candidate.series

    return (
        typeof candidate.total_visits === 'number' &&
        Number.isFinite(candidate.total_visits) &&
        candidate.total_visits >= 0 &&
        typeof candidate.unique_visitors_estimated === 'number' &&
        Number.isFinite(candidate.unique_visitors_estimated) &&
        candidate.unique_visitors_estimated >= 0 &&
        comparison !== undefined &&
        typeof comparison.has_previous_data === 'boolean' &&
        (comparison.percentage_change === null ||
            (typeof comparison.percentage_change === 'number' &&
                Number.isFinite(comparison.percentage_change))) &&
        ['up', 'down', 'flat', 'unavailable'].includes(comparison.direction) &&
        series !== undefined &&
        (series.granularity === 'hour' || series.granularity === 'day') &&
        isVisitSeries(series.current) &&
        isVisitSeries(series.previous) &&
        typeof candidate.meta?.timezone === 'string' &&
        candidate.meta.timezone.length > 0
    )
}

const credentials = { withCredentials: true }

export async function getStoreVisitsStats(
    period: StoreVisitsPeriod = 'today',
): Promise<StoreVisitsStatsResponse> {
    try {
        const response = await apiClient.get<StoreVisitsStatsResponse>(
            '/businesses/store-visits/stats',
            { ...credentials, params: { period } },
        )
        if (!isStoreVisitsStatsResponse(response.data)) {
            throw new Error('Store visits stats response is incomplete.')
        }
        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
