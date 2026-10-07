'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getDashboardSales } from './dashboardSales'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

export function useSalesData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'sales', user?.id ?? 'anonymous', businessId ?? 'none', period],
        queryFn: () => getDashboardSales(period),
        enabled: Boolean(user?.id && businessId),
        staleTime: 2 * 60 * 1000,
    })
}
