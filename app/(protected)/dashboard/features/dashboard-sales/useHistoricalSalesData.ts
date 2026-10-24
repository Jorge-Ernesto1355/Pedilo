'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getHistoricalSales } from './historicalSalesApi'

export function useHistoricalSalesData() {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'historical-sales', user?.id ?? 'anonymous', businessId ?? 'none'],
        queryFn: getHistoricalSales,
        enabled: Boolean(user?.id && businessId),
        staleTime: 0,
        retry: 3,
    })
}
