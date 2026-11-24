'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { keepPreviousInScope } from '@/src/lib/query/keepPreviousInScope'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useDashboardInsights(range: DateRange) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: ['dashboard', 'insights', user?.id ?? 'anonymous', businessId ?? 'none', range],
        queryFn: async () => getDashboardData(range).insights,
        enabled: Boolean(user?.id && businessId),
        // Al cambiar de periodo se mantienen los datos anteriores (marcados como
        // isPlaceholderData) en lugar de volver al skeleton completo.
        placeholderData: keepPreviousInScope(['dashboard', 'insights', user?.id ?? 'anonymous', businessId ?? 'none']),
        staleTime: 5 * 60 * 1000,
    })
}
