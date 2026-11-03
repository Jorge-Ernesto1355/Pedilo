'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
    getOrderCustomerDiscount,
    grantOrderCustomerDiscount,
} from '@/src/lib/api/customerDiscountApi'
import type { CustomerDiscountType } from '@/src/lib/api/order-types'

export function useOrderCustomerDiscount(orderId: string | null) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['order-discount', businessId, orderId],
        queryFn: () => getOrderCustomerDiscount(orderId as string),
        enabled: Boolean(orderId && businessId),
        retry: false,
        staleTime: 15_000,
    })
}

export function useGrantOrderCustomerDiscount(orderId: string) {
    const queryClient = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useMutation({
        mutationFn: (discount: { type: CustomerDiscountType; value: number }) =>
            grantOrderCustomerDiscount(orderId, discount),
        onSuccess: (discount) => {
            queryClient.setQueryData(['order-discount', businessId, orderId], discount)
            void queryClient.invalidateQueries({
                queryKey: ['order-discount', businessId, orderId],
            })
        },
    })
}
