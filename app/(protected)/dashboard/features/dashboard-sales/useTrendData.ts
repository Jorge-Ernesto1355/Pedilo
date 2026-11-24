'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { keepPreviousInScope } from '@/src/lib/query/keepPreviousInScope'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'
import { getDashboardTrend } from './trendApi'

export function useTrendData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'trend', user?.id ?? 'anonymous', businessId ?? 'none', period],
        queryFn: () => getDashboardTrend(period),
        enabled: Boolean(user?.id && businessId),
        // Al cambiar de periodo se mantienen los datos anteriores (marcados como
        // isPlaceholderData) en lugar de volver al skeleton completo.
        placeholderData: keepPreviousInScope(['dashboard', 'trend', user?.id ?? 'anonymous', businessId ?? 'none']),
        staleTime: 0,
        retry: 0,
    })
}
