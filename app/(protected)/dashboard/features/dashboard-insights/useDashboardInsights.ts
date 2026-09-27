'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useDashboardInsights(range: DateRange) {
    return useQuery({
        queryKey: ['dashboard', 'insights', range],
        queryFn: async () => getDashboardData(range).insights,
        staleTime: 5 * 60 * 1000,
    })
}
