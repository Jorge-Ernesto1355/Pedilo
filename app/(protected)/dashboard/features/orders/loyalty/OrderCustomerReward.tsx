'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import {
    loyaltyErrorMessage,
    loyaltyQueryKeys,
    redeemLoyaltyReward,
    type LoyaltyProgram,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import type { Order } from '@/src/lib/api/order-types'
import { notify } from '@/src/lib/notifications/notify'
import { useLoyaltyCardDetail } from '../../customers/loyalty/useCustomerLoyalty'
import { Confirm } from '../delivery/OrderDeliveryPanel'

/**
 * Premio pendiente del cliente en el detalle del pedido, para no tener que abrir su tarjeta.
 * - Pendiente o en preparación: ofrece aplicarlo a ESTE pedido (el servidor recalcula el total).
 * - Ya finalizado: solo informa que sigue disponible para su próximo pedido.
 * También dice si el cliente ya lo tenía antes de este pedido o lo ganó con él.
 */
export function OrderCustomerReward({
    order,
    program,
}: {
    order: Order
    program: LoyaltyProgram | undefined
}) {
    const client = useQueryClient()
    const [confirming, setConfirming] = useState(false)
    const customerId = program && order.status !== 'CANCELLED' ? (order.customerId ?? null) : null
    const card = useLoyaltyCardDetail(customerId)

    const apply = useMutation({
        mutationFn: (rewardId: string) => redeemLoyaltyReward(rewardId, order.id),
        onSuccess: (result) => {
            setConfirming(false)
            notify.success({
                title: `Premio aplicado al pedido #${order.orderNumber}`,
                description: result.reward.label,
            })
        },
        onError: (error) =>
            notify.error({
                title: 'No se pudo aplicar el premio',
                description: loyaltyErrorMessage(error),
            }),
        onSettled: () => {
            void client.invalidateQueries({ queryKey: ['orders'] })
            void client.invalidateQueries({ queryKey: ['order'] })
            if (customerId)
                void client.invalidateQueries({ queryKey: loyaltyQueryKeys.card(customerId) })
            void client.invalidateQueries({ queryKey: ['loyalty', 'cards'] })
            void client.invalidateQueries({ queryKey: loyaltyQueryKeys.summary })
        },
    })

    if (!customerId) return null

    if (card.isLoading) {
        return (
            <p
                role="status"
                data-cy="order-customer-reward-loading"
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#D7E1EF] bg-[#F7F9FC] px-3.5 py-3 text-sm font-semibold text-[#53647D]"
            >
                <LoaderCircle
                    className="size-4 shrink-0 animate-spin text-[#2451C5] motion-reduce:animate-none"
                    aria-hidden="true"
                />
                Revisando si el cliente tiene premio…
            </p>
        )
    }

    const reward = card.data?.rewards.find((item) => item.status === 'AVAILABLE')
    // Si el pedido ya lleva un premio aplicado, el resumen ya lo muestra.
    if (!reward || order.loyaltyReward?.active) return null

    const firstName = order.customerName?.split(' ')[0] ?? 'El cliente'
    const editable = order.status === 'PENDING' || order.status === 'PREPARING'
    // Un solo beneficio por pedido: el servidor rechaza el premio si ya hay otro descuento.
    const hasOtherDiscount = (order.discountAmount ?? 0) > 0
    const canApply = editable && !hasOtherDiscount
    const origin =
        order.createdAt && new Date(reward.createdAt) < new Date(order.createdAt)
            ? 'Ya lo tenía de antes de este pedido.'
            : 'Lo ganó con este pedido.'

    return (
        <section
            data-cy="order-customer-reward"
            aria-label="Premio de lealtad del cliente"
            className="space-y-3 rounded-xl border border-[#C9D7EA] bg-[#F4F7FF] p-3.5"
        >
            <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#2451C5]">
                    <Gift className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold text-[#12234A]">
                        {firstName} tiene un premio disponible
                    </p>
                    <p className="mt-0.5 break-words text-[#243556]">{reward.label}</p>
                    <p className="mt-0.5 text-xs text-[#53647D]">
                        {origin}{' '}
                        {canApply
                            ? 'Puedes aplicarlo a este pedido.'
                            : hasOtherDiscount && editable
                              ? 'Este pedido ya tiene un descuento: queda para el siguiente.'
                              : 'Queda disponible para su próximo pedido.'}
                    </p>
                </div>
                {canApply && !confirming ? (
                    <button
                        type="button"
                        data-cy="order-customer-reward-apply"
                        onClick={() => setConfirming(true)}
                        className="min-h-11 shrink-0 rounded-xl bg-[#1E40AF] px-3.5 text-sm font-bold text-white transition hover:bg-[#1A3697] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25"
                    >
                        Aplicar al pedido
                    </button>
                ) : null}
            </div>
            {canApply && confirming ? (
                <Confirm
                    text={`Se descontará "${reward.label}" de este pedido y el total se recalcula. Solo se devuelve si cancelas el pedido.`}
                    confirmLabel="Sí, aplicar premio"
                    confirmCy="order-customer-reward-confirm"
                    onConfirm={() => apply.mutate(reward.id)}
                    onCancel={() => setConfirming(false)}
                    busy={apply.isPending}
                    buttonSize="min-h-11 px-4 text-sm"
                />
            ) : null}
        </section>
    )
}
