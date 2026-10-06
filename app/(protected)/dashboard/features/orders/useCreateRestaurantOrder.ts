'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { createRestaurantOrder } from '@/src/lib/api/orderApi'
import type { CreateRestaurantOrderPayload } from '@/src/lib/api/order-types'

export function useCreateRestaurantOrder() {
    const client = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)

    return useMutation({
        mutationFn: (payload: CreateRestaurantOrderPayload) => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            return createRestaurantOrder(businessId, payload)
        },
        onSuccess: (order) => {
            void client.invalidateQueries({ queryKey: ['orders'] })
            void client.invalidateQueries({ queryKey: ['dashboard'] })
            void client.invalidateQueries({ queryKey: ['product-analytics'] })
            void client.invalidateQueries({ queryKey: ['customers'] })
            client.setQueryData(['order', order.id], order)
        },
    })
}
