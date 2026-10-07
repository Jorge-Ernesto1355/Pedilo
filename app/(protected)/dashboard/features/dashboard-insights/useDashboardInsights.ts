'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useDashboardInsights(range: DateRange) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'insights', user?.id ?? 'anonymous', businessId ?? 'none', range],
        queryFn: async () => getDashboardData(range).insights,
        enabled: Boolean(user?.id && businessId),
        staleTime: 5 * 60 * 1000,
    })
}
