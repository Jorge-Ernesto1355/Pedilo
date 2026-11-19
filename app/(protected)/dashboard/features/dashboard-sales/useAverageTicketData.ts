'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { keepPreviousInScope } from '@/src/lib/query/keepPreviousInScope'
import type { AverageTicketPeriod, SalesPeriod } from '../dashboard-data/dashboardData.types'
import { getAverageTicket } from './averageTicketApi'

const apiPeriodBySalesPeriod: Record<SalesPeriod, AverageTicketPeriod> = {
    today: 'today',
    '7d': '7d',
    '30d': '30d',
    thisMonth: 'this_month',
}

export const averageTicketQueryKey = (userId: string, period: SalesPeriod) =>
    ['dashboard', 'average-ticket', userId, apiPeriodBySalesPeriod[period]] as const

export function useAverageTicketData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId
    const apiPeriod = apiPeriodBySalesPeriod[period]

    return useQuery({
        queryKey: averageTicketQueryKey(user?.id ?? 'anonymous', period),
        queryFn: () => getAverageTicket(apiPeriod),
        enabled: Boolean(user?.id && businessId),
        // Al cambiar de periodo se mantienen los datos anteriores (marcados como
        // isPlaceholderData) en lugar de volver al skeleton completo.
        placeholderData: keepPreviousInScope([
            'dashboard',
            'average-ticket',
            user?.id ?? 'anonymous',
        ]),
        // A period change changes the query key; this prevents duplicate requests
        // for the same period during hydration or a component remount.
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        retry: 0,
    })
}
