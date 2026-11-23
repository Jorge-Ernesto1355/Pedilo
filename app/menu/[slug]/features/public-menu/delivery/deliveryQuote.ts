'use client'

import { useQuery } from '@tanstack/react-query'
import { ApiError, normalizeApiError } from '@/app/auth/lib/client/api-error'
import { publicApiClient } from '@/src/lib/api/publicClient'

export type DeliveryPin = { latitude: number; longitude: number }

export type DeliveryDraft = {
    address: string
    neighborhood: string
    reference: string
    pin: DeliveryPin | null
}

/** Lo que el checkout envía al crear el pedido. `expectedFee` es el envío que vio el cliente. */
export type DeliveryCheckout = {
    address: string
    neighborhood: string
    reference: string
    latitude: number
    longitude: number
    expectedFee: number
    distanceKm: number
}

/** El servidor detectó que el envío cambió: el pedido no se creó. */
export type DeliveryFeeChange = {
    expectedDeliveryFee: number
    currentDeliveryFee: number
    distanceKm: number
}

export const DELIVERY_ADDRESS_MIN_LENGTH = 5
export const DELIVERY_TEXT_MAX_LENGTH = 200
/** La colonia se muestra al repartidor como zona aproximada antes de tomar la entrega. */
export const DELIVERY_NEIGHBORHOOD_MIN_LENGTH = 2
export const DELIVERY_NEIGHBORHOOD_MAX_LENGTH = 100

export const emptyDeliveryDraft: DeliveryDraft = {
    address: '',
    neighborhood: '',
    reference: '',
    pin: null,
}

export type DeliveryQuoteState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; fee: number; distanceKm: number; maxDeliveryKm: number }
    | { status: 'out_of_range'; distanceKm: number; maxDeliveryKm: number }
    | { status: 'unavailable' }
    | { status: 'error' }

type QuoteResult = Exclude<DeliveryQuoteState, { status: 'idle' | 'loading' | 'error' }>

/** Cotización del servidor: el cliente nunca calcula la distancia ni el envío. */
async function fetchQuote(businessId: string, pin: DeliveryPin): Promise<QuoteResult> {
    try {
        const { data } = await publicApiClient.post<{
            quote: { distanceKm: number; fee: number; maxDeliveryKm: number }
        }>(`/public/businesses/${businessId}/delivery/quote`, pin)
        return { status: 'ok', ...data.quote }
    } catch (error) {
        const apiError = error instanceof ApiError ? error : normalizeApiError(error)
        if (apiError.code === 'DELIVERY_OUT_OF_RANGE') {
            const details = apiError.details as { distanceKm?: number; maxDeliveryKm?: number }
            return {
                status: 'out_of_range',
                distanceKm: Number(details?.distanceKm ?? 0),
                maxDeliveryKm: Number(details?.maxDeliveryKm ?? 0),
            }
        }
        if (
            apiError.code === 'DELIVERY_UNAVAILABLE' ||
            apiError.code === 'DELIVERY_NOT_CONFIGURED'
        ) {
            return { status: 'unavailable' }
        }
        throw apiError
    }
}

export function deliveryQuoteKey(businessId: string, pin: DeliveryPin | null) {
    return [
        'delivery-quote',
        businessId,
        pin ? pin.latitude.toFixed(6) : null,
        pin ? pin.longitude.toFixed(6) : null,
    ] as const
}

export function useDeliveryQuote(businessId: string, pin: DeliveryPin | null, enabled: boolean) {
    const query = useQuery({
        queryKey: deliveryQuoteKey(businessId, pin),
        queryFn: () => fetchQuote(businessId, pin!),
        enabled: enabled && Boolean(pin),
        retry: false,
        staleTime: 30_000,
    })
    const state: DeliveryQuoteState =
        !enabled || !pin
            ? { status: 'idle' }
            : query.isFetching && !query.data
              ? { status: 'loading' }
              : query.isError
                ? { status: 'error' }
                : query.data
                  ? query.data
                  : { status: 'loading' }
    return { state, isFetching: query.isFetching, refetch: query.refetch }
}

export function isDeliveryDraftComplete(draft: DeliveryDraft) {
    return (
        draft.address.trim().length >= DELIVERY_ADDRESS_MIN_LENGTH &&
        draft.neighborhood.trim().length >= DELIVERY_NEIGHBORHOOD_MIN_LENGTH &&
        draft.pin !== null
    )
}
