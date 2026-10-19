'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { AverageTicketPeriod, SalesPeriod } from '../dashboard-data/dashboardData.types'
import { getAverageTicket } from './averageTicketApi'

const apiPeriodBySalesPeriod: Record<SalesPeriod, AverageTicketPeriod> = {
    today: 'today',
    '7d': '7d',
    '30d': '30d',
    thisMonth: 'this_month',
}

export function useAverageTicketData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId
    const apiPeriod = apiPeriodBySalesPeriod[period]

    return useQuery({
        queryKey: [
            'dashboard',
            'average-ticket',
            user?.id ?? 'anonymous',
            businessId ?? 'none',
            apiPeriod,
        ],
        queryFn: () => getAverageTicket(apiPeriod),
        enabled: Boolean(user?.id && businessId),
        // Keep this metric in sync with the selected sales period, including when
        // the user returns to a period that was loaded earlier.
        staleTime: 0,
        retry: 3,
    })
}
