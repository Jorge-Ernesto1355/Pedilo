'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardSales } from './dashboardSales'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

export function useSalesData(period: SalesPeriod) {
    return useQuery({
        queryKey: ['dashboard', 'sales', period],
        queryFn: () => getDashboardSales(period),
        placeholderData: (previousData) => previousData,
        staleTime: 2 * 60 * 1000,
    })
}
