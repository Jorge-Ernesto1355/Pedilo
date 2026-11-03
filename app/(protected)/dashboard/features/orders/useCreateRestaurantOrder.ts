'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { createRestaurantOrder } from '@/src/lib/api/orderApi'
import type { CreateRestaurantOrderPayload, Order, OrdersResponse } from '@/src/lib/api/order-types'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'

export type CreateRestaurantOrderVariables = {
    payload: CreateRestaurantOrderPayload
    optimisticOrder: Order
    idempotencyKey: string
}

function matchesOrderFilter(order: Order, params: Record<string, unknown> | undefined) {
    if (!params) return true
    if (params.status && params.status !== order.status) return false
    const search = typeof params.search === 'string' ? params.search.toLowerCase() : ''
    if (!search) return true
    return [order.id, order.customerName ?? '', order.customerPhone ?? '', String(order.orderNumber)].some(
        (value) => value.toLowerCase().includes(search),
    )
}

function updateOrderQueries(
    client: ReturnType<typeof useQueryClient>,
    businessId: string,
    updater: (data: OrdersResponse, params: Record<string, unknown> | undefined) => OrdersResponse,
) {
    client.getQueriesData<OrdersResponse>({ queryKey: ['orders', businessId] }).forEach(([queryKey, data]) => {
        if (!data) return
        client.setQueryData(queryKey, updater(data, queryKey[2] as Record<string, unknown>))
    })
}

export function useCreateRestaurantOrder() {
    const client = useQueryClient()
    const userId = useAuthStore((state) => state.user?.id)
    const businessId = useAuthStore((state) => state.user?.businessId)

    return useMutation({
        mutationFn: ({ payload, idempotencyKey }: CreateRestaurantOrderVariables) => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            return createRestaurantOrder(businessId, payload, idempotencyKey)
        },
        onMutate: async ({ optimisticOrder }) => {
            if (!businessId) return undefined
            await client.cancelQueries({ queryKey: ['orders', businessId] })
            updateOrderQueries(client, businessId, (data, params) => {
                if (data.orders.some((order) => order.id === optimisticOrder.id)) return data
                const matches = matchesOrderFilter(optimisticOrder, params)
                const page = typeof params?.page === 'number' ? params.page : 1
                const limit = typeof params?.limit === 'number' ? params.limit : data.limit
                return {
                    ...data,
                    orders: page === 1 && matches ? [optimisticOrder, ...data.orders].slice(0, limit) : data.orders,
                    total: matches ? data.total + 1 : data.total,
                }
            })
            return { optimisticId: optimisticOrder.id }
        },
        onSuccess: (order, _variables, context) => {
            if (!businessId || !context) return
            updateOrderQueries(client, businessId, (data) => {
                const hasOptimistic = data.orders.some((item) => item.id === context.optimisticId)
                const hasPersisted = data.orders.some((item) => item.id === order.id)
                if (!hasOptimistic) return data
                return {
                    ...data,
                    orders: hasPersisted
                        ? data.orders.filter((item) => item.id !== context.optimisticId)
                        : data.orders.map((item) => item.id === context.optimisticId ? order : item),
                }
            })
            client.setQueryData(['order', userId ?? 'anonymous', businessId, order.id], order)
            void client.invalidateQueries({ queryKey: ['orders', businessId] })
            void client.invalidateQueries({ queryKey: ['dashboard'] })
            void client.invalidateQueries({ queryKey: ['product-analytics'] })
            void client.invalidateQueries({ queryKey: ['customers'] })
        },
        onError: (error, _variables, context) => {
            if (!businessId || !context) return
            const status = Number((error as { status?: unknown })?.status)
            const isDefinitive = [400, 401, 403, 404, 409, 422].includes(status)
            updateOrderQueries(client, businessId, (data) => {
                if (!data.orders.some((item) => item.id === context.optimisticId)) return data
                return {
                    ...data,
                    orders: isDefinitive
                        ? data.orders.filter((item) => item.id !== context.optimisticId)
                        : data.orders.map((item) => item.id === context.optimisticId ? { ...item, creationState: 'uncertain' as const } : item),
                    total: isDefinitive ? Math.max(0, data.total - 1) : data.total,
                }
            })
            notify.error({
                title: isDefinitive ? 'No se pudo crear la orden' : 'No pudimos confirmar la orden',
                description: isDefinitive
                    ? friendlyNotificationError(error, 'Revisa los datos e inténtalo nuevamente.')
                    : 'La orden puede haberse guardado. Actualiza la lista antes de volver a intentarlo.',
            })
        },
    })
}
