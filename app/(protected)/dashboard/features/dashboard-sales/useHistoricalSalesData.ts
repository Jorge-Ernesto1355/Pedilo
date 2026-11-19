'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getHistoricalSales } from './historicalSalesApi'

export const historicalSalesQueryKey = (userId: string) =>
    ['dashboard', 'historical-sales', userId] as const

export function useHistoricalSalesData() {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: historicalSalesQueryKey(user?.id ?? 'anonymous'),
        queryFn: getHistoricalSales,
        enabled: Boolean(user?.id && businessId),
        // Avoid a duplicate request when the protected layout hydrates or remounts.
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        retry: 0,
    })
}
