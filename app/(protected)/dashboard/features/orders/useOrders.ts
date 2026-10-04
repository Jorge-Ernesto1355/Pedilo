'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getOrder, getOrders, updateOrderStatus } from '@/src/lib/api/orderApi'
import type { OrderStatus } from '@/src/lib/api/order-types'
import { sileo } from 'sileo'
export function useOrders(params: {
    page: number
    limit: number
    status?: OrderStatus
    search?: string
}) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['orders', businessId, params],
        queryFn: () => getOrders(businessId as string, params),
        enabled: Boolean(businessId),
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    })
}
export function useOrder(orderId: string | null) {
    return useQuery({
        queryKey: ['order', orderId],
        queryFn: () => getOrder(orderId as string),
        enabled: Boolean(orderId),
        staleTime: 60 * 1000,
    })
}
export function useOrderStatusMutation() {
    const client = useQueryClient()
    return useMutation({
        mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
            updateOrderStatus(orderId, status),
        onSuccess: (order) => {
            void client.invalidateQueries({ queryKey: ['orders'] })
            client.setQueryData(['order', order.id], order)
            sileo.success({
                title: 'Estado actualizado',
                description: `Pedido #${order.orderNumber} actualizado correctamente.`,
            })
        },
        onError: (error) =>
            sileo.error({
                title: error instanceof Error ? error.message : 'No pudimos actualizar el pedido.',
            }),
    })
}
