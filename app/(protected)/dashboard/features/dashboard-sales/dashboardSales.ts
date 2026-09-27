import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { SalesDashboardResponse, SalesPeriod } from '../dashboard-data/dashboardData.types'

const credentials = { withCredentials: true }

export async function getDashboardSales(period: SalesPeriod): Promise<SalesDashboardResponse> {
    try {
        const response = await apiClient.get<SalesDashboardResponse>('/dashboard/sales', {
            ...credentials,
            params: { period },
        })

        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
