'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'
import { getDashboardTrend } from './trendApi'

export function useTrendData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'trend', user?.id ?? 'anonymous', businessId ?? 'none', period],
        queryFn: () => getDashboardTrend(period),
        enabled: Boolean(user?.id && businessId),
        staleTime: 0,
        retry: 3,
    })
}
