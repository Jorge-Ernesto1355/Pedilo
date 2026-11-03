'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    getCustomerDiscounts,
    grantCustomerDiscount,
    revokeCustomerDiscount,
} from '@/src/lib/api/customerDiscountApi'
import type { CustomerDiscountType } from '@/src/lib/api/order-types'

export function useCustomerDiscounts(customerId: string | null) {
    return useQuery({
        queryKey: ['customer-discounts', customerId],
        queryFn: () => getCustomerDiscounts(customerId as string),
        enabled: Boolean(customerId),
        staleTime: 30_000,
        retry: false,
    })
}

export function useGrantCustomerDiscount(customerId: string) {
    const client = useQueryClient()
    return useMutation({
        mutationFn: (input: { type: CustomerDiscountType; value: number }) =>
            grantCustomerDiscount(customerId, input),
        onSuccess: () => void client.invalidateQueries({ queryKey: ['customer-discounts', customerId] }),
    })
}

export function useRevokeCustomerDiscount(customerId: string) {
    const client = useQueryClient()
    return useMutation({
        mutationFn: (discountId: string) => revokeCustomerDiscount(customerId, discountId),
        onSuccess: () => void client.invalidateQueries({ queryKey: ['customer-discounts', customerId] }),
    })
}
