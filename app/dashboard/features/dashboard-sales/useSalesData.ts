'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../dashboard-data/dashboardData'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useSalesData(range: DateRange) {
    return useQuery({ queryKey: ['dashboard', 'sales', range], queryFn: async () => getDashboardData(range).sales })
}
