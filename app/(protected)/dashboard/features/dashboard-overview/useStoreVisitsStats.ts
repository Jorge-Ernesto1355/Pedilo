'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getStoreVisitsStats } from './storeVisitsStats'
import type { StoreVisitsPeriod } from './storeVisitsStats'

export function useStoreVisitsStats(period: StoreVisitsPeriod = 'today') {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: [
            'dashboard',
            'store-visits-stats',
            user?.id ?? 'anonymous',
            businessId ?? 'none',
            period,
        ],
        queryFn: () => getStoreVisitsStats(period),
        enabled: Boolean(user?.id && businessId),
        staleTime: 60 * 1000,
    })
}
