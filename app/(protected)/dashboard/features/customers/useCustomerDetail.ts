'use client'

import { useQuery } from '@tanstack/react-query'
import { useCustomerDiscounts, useGrantCustomerDiscount, useRevokeCustomerDiscount } from './useCustomerDiscounts'
import { getCustomerOrders } from '@/src/lib/api/orderApi'

export function useCustomerOrders(customerId: string | null, page: number) {
    return useQuery({
        queryKey: ['customer-orders', customerId, page],
        queryFn: () => getCustomerOrders(customerId as string, { page, limit: 10 }),
        enabled: Boolean(customerId),
        staleTime: 30_000,
        retry: false,
    })
}

export { useCustomerDiscounts, useGrantCustomerDiscount, useRevokeCustomerDiscount }
