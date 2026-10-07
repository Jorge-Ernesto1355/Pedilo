'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getOrder, getOrders, updateOrderStatus } from '@/src/lib/api/orderApi'
import type { OrderPeriod, OrderStatus } from '@/src/lib/api/order-types'
import {
    friendlyNotificationError,
    notify,
    orderStatusNotification,
} from '@/src/lib/notifications/notify'
export function useOrders(params: {
    page: number
    limit: number
    status?: OrderStatus
    search?: string
    period?: OrderPeriod
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
            notify.success(orderStatusNotification(order.status, order.orderNumber))
        },
        onError: (error) =>
            notify.error({
                title: 'No se pudo actualizar la orden',
                description: friendlyNotificationError(error, 'Inténtalo nuevamente.'),
            }),
    })
}
