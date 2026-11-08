import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { SalesDashboardResponse, SalesPeriod } from '../dashboard-data/dashboardData.types'

const credentials = { withCredentials: true }
const inFlightSalesRequests = new Map<string, Promise<SalesDashboardResponse>>()
const recentlyResolvedSales = new Map<
    string,
    { data: SalesDashboardResponse; expiresAt: number }
>()
// Auth hydration can settle after the first response in development. Keep the
// resolved value for the dashboard's short initialization window so a remount
// cannot issue the same authenticated request again.
const duplicateSuppressionWindowMs = 60_000

export async function getDashboardSales(period: SalesPeriod): Promise<SalesDashboardResponse> {
    const recent = recentlyResolvedSales.get(period)
    if (recent && recent.expiresAt > Date.now()) return recent.data
    if (recent) recentlyResolvedSales.delete(period)

    const existingRequest = inFlightSalesRequests.get(period)
    if (existingRequest) return existingRequest

    const request = requestDashboardSales(period)
    inFlightSalesRequests.set(period, request)
    void request.then(
        (data) => {
            inFlightSalesRequests.delete(period)
            recentlyResolvedSales.set(period, {
                data,
                expiresAt: Date.now() + duplicateSuppressionWindowMs,
            })
        },
        () => inFlightSalesRequests.delete(period),
    )
    return request
}

async function requestDashboardSales(period: SalesPeriod): Promise<SalesDashboardResponse> {
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
