import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { SalesPeriod, TrendDashboardResponse } from '../dashboard-data/dashboardData.types'

export async function getDashboardTrend(period: SalesPeriod): Promise<TrendDashboardResponse> {
    try {
        const response = await apiClient.get<TrendDashboardResponse>('/dashboard/trend', {
            withCredentials: true,
            params: { period },
        })

        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
