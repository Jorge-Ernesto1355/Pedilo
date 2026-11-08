'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getDashboardSales } from './dashboardSales'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

export function useSalesData(period: SalesPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        // businessId can be hydrated a moment after the authenticated user. It
        // is not part of this endpoint's response identity and including it here
        // would create a second query for the same user and period.
        queryKey: ['dashboard', 'sales', user?.id ?? 'anonymous', period],
        queryFn: () => getDashboardSales(period),
        enabled: Boolean(user?.id && businessId),
        // Keep the initial dashboard request stable across hydration/remounts. A
        // different period still creates a different query key and fetches once.
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        // The cards expose an explicit retry action. Automatic retries delayed
        // the error state and caused several requests after a single failure.
        retry: 0,
    })
}
