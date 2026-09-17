'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useProductPerformance(range: DateRange) {
    return useQuery({ queryKey: ['dashboard', 'products', range], queryFn: async () => getDashboardData(range).products })
}
