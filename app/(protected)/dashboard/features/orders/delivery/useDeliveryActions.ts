'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { useAuthStore } from '@/store/authStore'
import { ApiError } from '@/app/auth/lib/client/api-error'
import {
    confirmOrderTransfer,
    createDeliveryOffer,
    handOffDelivery,
    releaseDelivery,
} from '@/src/lib/api/orderApi'

/**
 * Token en claro de la oferta vigente por pedido. Solo vive en memoria de esta pestaña
 * (el backend guarda únicamente su hash): tras recargar, "Compartir de nuevo" genera uno nuevo.
 */
type OfferTokenState = {
    tokens: Record<string, string>
    setToken: (orderId: string, token: string) => void
}

export const useOfferTokenStore = create<OfferTokenState>((set) => ({
    tokens: {},
    setToken: (orderId, token) =>
        set((state) => ({ tokens: { ...state.tokens, [orderId]: token } })),
}))

export type DeliveryAction = 'findCourier' | 'release' | 'handOff' | 'confirmTransfer'

export function deliveryActionErrorMessage(error: unknown) {
    const code = error instanceof ApiError ? error.code : undefined
    switch (code) {
        case 'DELIVERY_TRANSFER_NOT_CONFIRMED':
            return 'Marca la transferencia como recibida antes de buscar repartidor.'
        case 'DELIVERY_ORDER_NOT_READY':
            return 'Acepta el pedido antes de buscar repartidor.'
        case 'DELIVERY_ALREADY_ACCEPTED':
            return 'Un repartidor ya tomó esta entrega. Actualizamos la tarjeta.'
        case 'DELIVERY_CLOSED':
        case 'DELIVERY_INVALID_TRANSITION':
            return 'La entrega cambió mientras tanto. Actualizamos la tarjeta.'
        case 'ORDER_CANCELLED':
            return 'El pedido está cancelado.'
        default:
            return 'No pudimos actualizar la entrega. Inténtalo de nuevo.'
    }
}

export function useDeliveryActions(orderId: string) {
    const client = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const setToken = useOfferTokenStore((state) => state.setToken)

    const refresh = () => {
        const businessId = user?.businessId
        if (!businessId) return
        void client.invalidateQueries({
            queryKey: ['order', user?.id ?? 'anonymous', businessId, orderId],
        })
        void client.invalidateQueries({ queryKey: ['orders', businessId] })
    }

    return useMutation({
        mutationFn: async (action: DeliveryAction): Promise<{ offerToken?: string }> => {
            if (action === 'findCourier') return createDeliveryOffer(orderId)
            if (action === 'release') return releaseDelivery(orderId)
            if (action === 'handOff') {
                await handOffDelivery(orderId)
                return {}
            }
            await confirmOrderTransfer(orderId)
            return {}
        },
        onSuccess: (result) => {
            if (result.offerToken) setToken(orderId, result.offerToken)
            refresh()
        },
        // Un 409 significa que la entrega cambió en otro lado: se vuelve a leer el pedido.
        onError: refresh,
    })
}
