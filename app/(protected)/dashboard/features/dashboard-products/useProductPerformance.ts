'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useProductPerformance(range: DateRange) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'products', user?.id ?? 'anonymous', businessId ?? 'none', range],
        queryFn: async () => getDashboardData(range).products,
        enabled: Boolean(user?.id && businessId),
    })
}
