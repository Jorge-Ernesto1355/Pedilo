import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type {
    Order,
    OrderStatus,
    OrderStatusUpdate,
    OrdersResponse,
} from '@/src/lib/api/order-types'

export function orderStatusRevision(order: Order) {
    return order.statusRevision ?? order.statusHistory.length
}

function applyUpdate(order: Order, update: OrderStatusUpdate, optimistic = false): Order {
    const currentRevision = orderStatusRevision(order)
    if (update.statusRevision < currentRevision) return order
    if (update.statusRevision === currentRevision && update.status !== order.status) return order

    const lastStatus = order.statusHistory.at(-1)?.status
    const statusHistory =
        lastStatus === update.status
            ? order.statusHistory.map((entry, index) =>
                  index === order.statusHistory.length - 1
                      ? { ...entry, createdAt: update.updatedAt ?? entry.createdAt }
                      : entry,
              )
            : [
                  ...order.statusHistory,
                  {
                      status: update.status,
                      createdAt: update.updatedAt ?? new Date().toISOString(),
                  },
              ]

    return {
        ...order,
        status: update.status,
        updatedAt: update.updatedAt ?? order.updatedAt,
        statusRevision: update.statusRevision,
        statusOptimistic: optimistic,
        statusHistory,
    }
}

function keyParams(key: QueryKey) {
    const value = key[2]
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function matchesSearch(order: Order, search: unknown) {
    if (typeof search !== 'string' || !search.trim()) return true
    const normalized = search.trim().toLocaleLowerCase('es-MX')
    return [order.customerName, order.customerPhone, String(order.orderNumber)]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es-MX').includes(normalized))
}

export function reconcileOrderStatusInCache(
    client: QueryClient,
    businessId: string,
    userId: string,
    update: OrderStatusUpdate,
    sourceOrder?: Order,
    optimistic = false,
) {
    const listEntries = client.getQueriesData<OrdersResponse>({ queryKey: ['orders', businessId] })
    const detailKey = ['order', userId, businessId, update.id] as const
    const detailOrder = client.getQueryData<Order>(detailKey)
    const sourceQueryKeys = listEntries
        .filter(
            ([key, value]) =>
                keyParams(key).limit !== 1 && value?.orders.some((item) => item.id === update.id),
        )
        .map(([key]) => key)
    const cachedListOrders = listEntries.flatMap(
        ([, value]) => value?.orders.filter((item) => item.id === update.id) ?? [],
    )
    const original = [detailOrder, ...cachedListOrders, sourceOrder]
        .filter((order): order is Order => Boolean(order))
        .sort((left, right) => orderStatusRevision(right) - orderStatusRevision(left))[0]
    if (
        original &&
        (update.statusRevision < orderStatusRevision(original) ||
            (update.statusRevision === orderStatusRevision(original) &&
                update.status !== original.status))
    )
        return { previousOrder: original, nextOrder: original }
    const nextOrder = original ? applyUpdate(original, update, optimistic) : undefined

    for (const [key, value] of listEntries) {
        if (!value) continue
        const params = keyParams(key)
        const isCount = params.limit === 1
        if (isCount) {
            const filteredStatus = params.status as OrderStatus | undefined
            if (!filteredStatus || !original || original.status === update.status) continue
            const delta =
                filteredStatus === original.status ? -1 : filteredStatus === update.status ? 1 : 0
            if (delta)
                client.setQueryData<OrdersResponse>(key, {
                    ...value,
                    total: Math.max(0, value.total + delta),
                })
            continue
        }

        const containsOrder = value.orders.some((order) => order.id === update.id)
        const hasSourceInSameScope = sourceQueryKeys.some((sourceKey) => {
            const sourceParams = keyParams(sourceKey)
            return (
                sourceParams.period === params.period &&
                sourceParams.search === params.search &&
                sourceParams.page === params.page &&
                sourceParams.limit === params.limit
            )
        })
        const canInsert =
            !containsOrder &&
            Boolean(nextOrder) &&
            params.status === update.status &&
            params.page === 1 &&
            hasSourceInSameScope &&
            matchesSearch(nextOrder!, params.search)

        const orders = value.orders
            .filter(
                (order) =>
                    order.id !== update.id || !params.status || params.status === update.status,
            )
            .map((order) =>
                order.id === update.id && nextOrder
                    ? applyUpdate(order, update, optimistic)
                    : order,
            )

        if (canInsert && nextOrder) orders.unshift(nextOrder)
        const uniqueOrders = Array.from(new Map(orders.map((order) => [order.id, order])).values())
        client.setQueryData<OrdersResponse>(key, { ...value, orders: uniqueOrders })
    }

    if (nextOrder) client.setQueryData(detailKey, nextOrder)
    return { previousOrder: original, nextOrder, sourceQueryKeys }
}

export function rollbackOrderStatusInCache(
    client: QueryClient,
    businessId: string,
    userId: string,
    orderId: string,
    attemptedStatus: OrderStatus,
    optimisticRevision: number,
    previousOrder: Order,
    sourceQueryKeys: QueryKey[] = [],
) {
    const listEntries = client.getQueriesData<OrdersResponse>({ queryKey: ['orders', businessId] })
    const detailKey = ['order', userId, businessId, orderId] as const
    const cachedOrders = listEntries
        .flatMap(([, value]) => value?.orders ?? [])
        .filter((order) => order.id === orderId)
    const current = [client.getQueryData<Order>(detailKey), ...cachedOrders]
        .filter((order): order is Order => Boolean(order))
        .sort((left, right) => orderStatusRevision(right) - orderStatusRevision(left))[0]
    const currentOrOptimistic =
        current ??
        ({
            ...previousOrder,
            status: attemptedStatus,
            statusRevision: optimisticRevision,
            statusOptimistic: true,
        } satisfies Order)
    if (
        currentOrOptimistic.status !== attemptedStatus ||
        orderStatusRevision(currentOrOptimistic) !== optimisticRevision
    )
        return false

    for (const [key, value] of listEntries) {
        if (!value) continue
        const params = keyParams(key)
        if (params.limit === 1) {
            const status = params.status as OrderStatus | undefined
            if (status === attemptedStatus)
                client.setQueryData<OrdersResponse>(key, {
                    ...value,
                    total: Math.max(0, value.total - 1),
                })
            else if (status === previousOrder.status)
                client.setQueryData<OrdersResponse>(key, { ...value, total: value.total + 1 })
            continue
        }

        const hasPrevious = value.orders.some((order) => order.id === orderId)
        const orders = value.orders.filter(
            (order) =>
                order.id !== orderId || !params.status || params.status === previousOrder.status,
        )
        if (
            !hasPrevious &&
            params.status === previousOrder.status &&
            params.page === 1 &&
            sourceQueryKeys.some(
                (sourceKey) => JSON.stringify(sourceKey) === JSON.stringify(key),
            ) &&
            matchesSearch(previousOrder, params.search)
        )
            orders.unshift(previousOrder)
        else if (hasPrevious && (!params.status || params.status === previousOrder.status)) {
            const index = orders.findIndex((order) => order.id === orderId)
            if (index >= 0) orders[index] = previousOrder
        }
        client.setQueryData<OrdersResponse>(key, {
            ...value,
            orders: Array.from(new Map(orders.map((order) => [order.id, order])).values()),
        })
    }

    const detailOrder = client.getQueryData<Order>(detailKey)
    if (detailOrder) client.setQueryData(detailKey, previousOrder)
    return true
}
