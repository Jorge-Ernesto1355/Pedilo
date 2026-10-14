import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type {
    AverageTicketPeriod,
    AverageTicketResponse,
} from '../dashboard-data/dashboardData.types'

export async function getAverageTicket(
    period: AverageTicketPeriod,
): Promise<AverageTicketResponse> {
    try {
        const response = await apiClient.get<AverageTicketResponse>('/analytics/average-ticket', {
            withCredentials: true,
            params: { period },
        })

        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
