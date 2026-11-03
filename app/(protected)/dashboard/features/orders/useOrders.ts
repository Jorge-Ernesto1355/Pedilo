'use client'
import {
    keepPreviousData,
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getOrder, getOrders, updateOrderStatus } from '@/src/lib/api/orderApi'
import type { OrderPeriod, OrderStatus } from '@/src/lib/api/order-types'
import {
    friendlyNotificationError,
    notify,
    orderStatusNotification,
} from '@/src/lib/notifications/notify'
import { useCallback, useRef, useState } from 'react'
import type { Order, OrderStatusUpdate } from '@/src/lib/api/order-types'
import {
    orderStatusRevision,
    reconcileOrderStatusInCache,
    rollbackOrderStatusInCache,
} from './orderStatusSync'
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
        placeholderData: keepPreviousData,
        staleTime: 30 * 1000,
    })
}

export function useOrderStatusCounts(params: { search?: string; period?: OrderPeriod }) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQueries({
        queries: (['PENDING', 'PREPARING', 'READY', 'CANCELLED'] as const).map((status) => ({
            queryKey: ['orders', businessId, { ...params, status, page: 1, limit: 1 }],
            queryFn: () =>
                getOrders(businessId as string, {
                    page: 1,
                    limit: 1,
                    status,
                    ...params,
                }),
            enabled: Boolean(businessId),
            staleTime: 30 * 1000,
        })),
    })
}
export function useOrder(orderId: string | null) {
    const user = useAuthStore((state) => state.user)
    return useQuery({
        queryKey: ['order', user?.id ?? 'anonymous', user?.businessId ?? 'none', orderId],
        queryFn: () => getOrder(orderId as string),
        enabled: Boolean(orderId && user?.businessId),
        staleTime: 60 * 1000,
    })
}
export function useOrderStatusMutation() {
    const client = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const inFlightOrderIds = useRef(new Set<string>())
    const confirmedStatusRequests = useRef(new Set<string>())
    const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(() => new Set())
    const mutation = useMutation({
        mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
            updateOrderStatus(orderId, status),
        onMutate: async ({ orderId, status }) => {
            const businessId = user?.businessId
            const userId = user?.id ?? 'anonymous'
            if (!businessId) return undefined
            await Promise.all([
                client.cancelQueries({ queryKey: ['orders', businessId] }),
                client.cancelQueries({ queryKey: ['order', userId, businessId, orderId] }),
            ])

            const detailKey = ['order', userId, businessId, orderId] as const
            const detailOrder = client.getQueryData<Order>(detailKey)
            const listOrders = client
                .getQueriesData<{ orders: Order[] }>({ queryKey: ['orders', businessId] })
                .flatMap(([, data]) => data?.orders ?? [])
                .filter((order) => order.id === orderId)
            const previousOrder = [detailOrder, ...listOrders]
                .filter((order): order is Order => Boolean(order))
                .sort((left, right) => orderStatusRevision(right) - orderStatusRevision(left))[0]
            if (!previousOrder) return undefined

            const optimisticRevision = orderStatusRevision(previousOrder) + 1
            const optimisticUpdate: OrderStatusUpdate = {
                id: orderId,
                orderNumber: previousOrder.orderNumber,
                status,
                updatedAt: new Date().toISOString(),
                statusRevision: optimisticRevision,
            }
            const { sourceQueryKeys } = reconcileOrderStatusInCache(
                client,
                businessId,
                userId,
                optimisticUpdate,
                previousOrder,
                true,
            )
            return {
                businessId,
                userId,
                previousOrder,
                optimisticRevision,
                sourceQueryKeys,
                status,
            }
        },
        onSuccess: (orderUpdate) => {
            const businessId = user?.businessId
            if (!businessId) return
            const result = reconcileOrderStatusInCache(
                client,
                businessId,
                user?.id ?? 'anonymous',
                orderUpdate,
            )
            void client.invalidateQueries({ queryKey: ['orders', businessId] })
            const confirmedOrder = result.nextOrder ?? orderUpdate
            notify.success(
                orderStatusNotification(confirmedOrder.status, confirmedOrder.orderNumber),
            )
        },
        onError: async (error, variables, context) => {
            const businessId = context?.businessId ?? user?.businessId
            const userId = context?.userId ?? user?.id ?? 'anonymous'
            const requestKey = `${variables.orderId}:${context?.optimisticRevision ?? 0}`
            if (!businessId) {
                notify.error({
                    title: 'No se pudo actualizar la orden',
                    description: friendlyNotificationError(error, 'Inténtalo nuevamente.'),
                })
                return
            }

            if (context?.previousOrder) {
                try {
                    const persistedOrder = await getOrder(variables.orderId)
                    const persistedTransition =
                        persistedOrder.statusHistory.some(
                            (entry) => entry.status === variables.status,
                        ) && persistedOrder.statusHistory.length >= context.optimisticRevision
                    if (persistedTransition) {
                        client.setQueryData(
                            ['order', userId, businessId, variables.orderId],
                            persistedOrder,
                        )
                        reconcileOrderStatusInCache(client, businessId, userId, {
                            id: persistedOrder.id,
                            orderNumber: persistedOrder.orderNumber,
                            status: persistedOrder.status,
                            updatedAt: persistedOrder.updatedAt,
                            statusRevision: persistedOrder.statusHistory.length,
                        })
                        confirmedStatusRequests.current.add(requestKey)
                        notify.success(
                            orderStatusNotification(
                                persistedOrder.status,
                                persistedOrder.orderNumber,
                            ),
                        )
                        void client.invalidateQueries({ queryKey: ['orders', businessId] })
                        return
                    }
                } catch {
                    // The rollback below remains the fallback if the confirmation read also fails.
                }
            }

            const latestOrder =
                client.getQueryData<Order>(['order', userId, businessId, variables.orderId]) ??
                client
                    .getQueriesData<{ orders: Order[] }>({ queryKey: ['orders', businessId] })
                    .flatMap(([, data]) => data?.orders ?? [])
                    .find((order) => order.id === variables.orderId)

            const confirmedByStream =
                latestOrder?.status === variables.status &&
                latestOrder.statusOptimistic !== true &&
                context !== undefined &&
                orderStatusRevision(latestOrder) >= context.optimisticRevision
            if (confirmedByStream) {
                confirmedStatusRequests.current.add(requestKey)
                notify.success(orderStatusNotification(latestOrder.status, latestOrder.orderNumber))
                void client.invalidateQueries({ queryKey: ['orders', businessId] })
                return
            }

            if (context?.previousOrder)
                rollbackOrderStatusInCache(
                    client,
                    businessId,
                    userId,
                    variables.orderId,
                    variables.status,
                    context.optimisticRevision,
                    context.previousOrder,
                    context.sourceQueryKeys,
                )
            notify.error({
                title: 'No se pudo actualizar la orden',
                description: friendlyNotificationError(error, 'Inténtalo nuevamente.'),
            })
            void client.invalidateQueries({ queryKey: ['orders', businessId] })
        },
        onSettled: (_data, _error, variables, context) => {
            inFlightOrderIds.current.delete(variables.orderId)
            confirmedStatusRequests.current.delete(
                `${variables.orderId}:${context?.optimisticRevision ?? 0}`,
            )
            setPendingOrderIds((current) => {
                if (!current.has(variables.orderId)) return current
                const next = new Set(current)
                next.delete(variables.orderId)
                return next
            })
        },
    })

    const mutateStatus = useCallback(
        (
            variables: { orderId: string; status: OrderStatus },
            callbacks?: Parameters<typeof mutation.mutate>[1],
        ) => {
            if (inFlightOrderIds.current.has(variables.orderId)) return false
            inFlightOrderIds.current.add(variables.orderId)
            setPendingOrderIds((current) => new Set(current).add(variables.orderId))
            mutation.mutate(variables, {
                ...callbacks,
                onError: (error, values, context, mutation) => {
                    const latestOrder =
                        client.getQueryData<Order>([
                            'order',
                            user?.id ?? 'anonymous',
                            user?.businessId ?? 'none',
                            values.orderId,
                        ]) ??
                        client
                            .getQueriesData<{ orders: Order[] }>({
                                queryKey: ['orders', user?.businessId],
                            })
                            .flatMap(([, data]) => data?.orders ?? [])
                            .find((order) => order.id === values.orderId)
                    const wasConfirmed =
                        confirmedStatusRequests.current.has(
                            `${values.orderId}:${context?.optimisticRevision ?? 0}`,
                        ) ||
                        (latestOrder?.status === values.status &&
                            latestOrder.statusOptimistic !== true &&
                            context !== undefined &&
                            orderStatusRevision(latestOrder) >= context.optimisticRevision)
                    if (!wasConfirmed) callbacks?.onError?.(error, values, context, mutation)
                },
                onSettled: (data, error, values, context, mutation) => {
                    confirmedStatusRequests.current.delete(
                        `${values.orderId}:${context?.optimisticRevision ?? 0}`,
                    )
                    callbacks?.onSettled?.(data, error, values, context, mutation)
                },
            })
            return true
        },
        [client, mutation, user?.businessId, user?.id],
    )

    return { ...mutation, mutateStatus, pendingOrderIds }
}
