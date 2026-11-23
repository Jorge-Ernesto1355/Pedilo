'use client'

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
    loyaltyErrorMessage,
    loyaltyQueryKeys,
    stampLoyaltyOrder,
    type LoyaltyStampResult,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import type { Order, OrderStatusUpdate, OrderLoyaltyStamp } from '@/src/lib/api/order-types'
import { notify } from '@/src/lib/notifications/notify'
import { useAuthStore } from '@/store/authStore'
import { sendLoyaltyCardByWhatsApp } from '../../customers/loyalty/sendLoyaltyCard'
import { stampToastTitle } from '../../customers/loyalty/useCustomerLoyalty'

/** Estado final del pedido: "Entregado" a domicilio; "Listo" en local o para llevar. */
export function isOrderFinished(order: Pick<Order, 'status' | 'fulfillmentType'>) {
    return order.fulfillmentType === 'DELIVERY'
        ? order.status === 'DELIVERED'
        : order.status === 'READY'
}

type Snapshot = Array<[readonly unknown[], unknown]>

/** Cambia el sello del pedido en todas las listas y el detalle en caché. */
function setOrderStamp(
    client: QueryClient,
    orderId: string,
    stamp: OrderLoyaltyStamp | null,
): Snapshot {
    const snapshot: Snapshot = []
    for (const [key, data] of client.getQueriesData<{ orders: Order[] } | Order>({
        queryKey: ['orders'],
    })) {
        if (!data || !('orders' in data)) continue
        if (!data.orders.some((order) => order.id === orderId)) continue
        snapshot.push([key, data])
        client.setQueryData(key, {
            ...data,
            orders: data.orders.map((order) =>
                order.id === orderId ? { ...order, loyaltyStamp: stamp } : order,
            ),
        })
    }
    for (const [key, data] of client.getQueriesData<Order>({ queryKey: ['order'] })) {
        if (!data || data.id !== orderId) continue
        snapshot.push([key, data])
        client.setQueryData(key, { ...data, loyaltyStamp: stamp })
    }
    return snapshot
}

export type LoyaltyNoticeContext = {
    restaurantName: string
    rewardLabel: string
}

/** "Ana completó su tarjeta, premio disponible" con "Avisar por WhatsApp" (wa.me). */
export function notifyCardCompleted(
    client: QueryClient,
    input: { customerId: string | null; customerFirstName: string | null; hasPhone: boolean },
    context: LoyaltyNoticeContext,
) {
    notify.success({
        title: `${input.customerFirstName ?? 'Tu cliente'} completó su tarjeta, premio disponible`,
        duration: 12_000,
        ...(input.customerId && input.hasPhone
            ? {
                  button: {
                      title: 'Avisar por WhatsApp',
                      onClick: () =>
                          void sendLoyaltyCardByWhatsApp(
                              client,
                              input.customerId!,
                              context.restaurantName,
                              context.rewardLabel,
                              'completed',
                          ),
                  },
              }
            : {}),
    })
}

/**
 * "Dar sello" a un pedido desde la comanda. Bloquea mientras corre (el servidor igual es
 * idempotente), marca el sello al instante y lo revierte si el servidor lo rechaza.
 */
export function useStampOrder(context: LoyaltyNoticeContext) {
    const client = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)
    const mutation = useMutation({
        mutationFn: ({
            order,
            customer,
        }: {
            order: Order
            customer?: { name: string; phone: string }
        }) => stampLoyaltyOrder(order.id, customer),
        onMutate: async ({ order }) => {
            await client.cancelQueries({ queryKey: ['orders'] })
            const snapshot = setOrderStamp(client, order.id, {
                id: 'pendiente',
                position: 0,
                source: 'ORDER_MANUAL',
                createdAt: new Date().toISOString(),
            })
            return { snapshot }
        },
        onSuccess: (result: LoyaltyStampResult, { order }) => {
            setOrderStamp(client, order.id, {
                id: result.stamp.id,
                position: result.stamp.position,
                source: result.stamp.source,
                createdAt: result.stamp.createdAt,
            })
            if (result.reward) {
                notifyCardCompleted(
                    client,
                    {
                        customerId: result.card.customerId,
                        customerFirstName: result.customerFirstName,
                        hasPhone: Boolean(order.customerPhone),
                    },
                    { ...context, rewardLabel: result.reward.label },
                )
            } else if (!result.alreadyStamped) {
                notify.success({ title: stampToastTitle(result) })
            }
        },
        onError: (error, variables, mutationContext) => {
            mutationContext?.snapshot.forEach(([key, value]) => client.setQueryData(key, value))
            notify.error({
                title: 'No se pudo dar el sello',
                description: loyaltyErrorMessage(error),
                dedupeKey: `order-stamp-error-${variables.order.id}`,
                button: { title: 'Reintentar', onClick: () => mutation.mutate(variables) },
            })
        },
        onSettled: (_data, _error, { order }) => {
            if (businessId) void client.invalidateQueries({ queryKey: ['orders', businessId] })
            if (order.customerId)
                void client.invalidateQueries({ queryKey: loyaltyQueryKeys.card(order.customerId) })
            void client.invalidateQueries({ queryKey: ['loyalty', 'cards'] })
            void client.invalidateQueries({ queryKey: loyaltyQueryKeys.summary })
        },
    })
    return mutation
}

/**
 * Aviso al finalizar un pedido:
 * - Manual: aviso discreto con "Dar sello" (no bloquea la cocina).
 * - Automático: solo informa ("Sello dado a Ana (5 de 8)") o la tarjeta completada.
 */
export function useLoyaltyStatusNotice(
    context: LoyaltyNoticeContext,
    stamp: ReturnType<typeof useStampOrder>,
) {
    const client = useQueryClient()
    return (update: OrderStatusUpdate, order: Order | undefined) => {
        const loyalty = update.loyalty
        if (!loyalty) return
        if (loyalty.mode === 'AUTO' && loyalty.stamped) {
            if (loyalty.stamped.completed) {
                notifyCardCompleted(
                    client,
                    {
                        customerId: order?.customerId ?? null,
                        customerFirstName: loyalty.stamped.customerFirstName,
                        hasPhone: Boolean(order?.customerPhone),
                    },
                    { ...context, rewardLabel: loyalty.stamped.rewardLabel ?? context.rewardLabel },
                )
            } else {
                notify.info({
                    title: `Sello dado a ${loyalty.stamped.customerFirstName ?? 'tu cliente'} (${loyalty.stamped.stampsCount} de ${loyalty.stamped.stampsRequired})`,
                })
            }
            return
        }
        if (loyalty.mode === 'MANUAL' && loyalty.eligible && order) {
            notify.info({
                title: `Pedido #${update.orderNumber} listo`,
                description: `Puedes darle su sello a ${order.customerName?.split(' ')[0] ?? 'tu cliente'}.`,
                duration: 10_000,
                dedupeKey: `loyalty-ready-${order.id}`,
                button: { title: 'Dar sello', onClick: () => stamp.mutate({ order }) },
            })
        }
    }
}
