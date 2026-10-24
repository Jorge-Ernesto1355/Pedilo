import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { HistoricalSalesResponse } from '../dashboard-data/dashboardData.types'

export async function getHistoricalSales(): Promise<HistoricalSalesResponse> {
    try {
        const response = await apiClient.get<HistoricalSalesResponse>(
            '/dashboard/historical-sales',
            {
                withCredentials: true,
            },
        )

        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
