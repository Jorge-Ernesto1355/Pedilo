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
        // Each period selection should ask the API for its current value. This also
        // makes switching back to a previously selected period observable to the UI.
        staleTime: 0,
        retry: 3,
    })
}
