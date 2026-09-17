'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useOrdersData(range: DateRange) {
    return useQuery({ queryKey: ['dashboard', 'orders', range], queryFn: async () => getDashboardData(range).orders })
}
