import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { publicApiClient } from '@/src/lib/api/publicClient'

// Endpoints públicos del repartidor: sin cuenta, solo con el token del link.

/** Antes de tomarla: nunca trae calle, número, coordenadas ni datos del cliente. */
export type CourierOffer =
    | {
          state: 'AVAILABLE'
          restaurantName: string
          zone: string
          courierEarnings: number
          amountToAdvance: number
          itemCount: number
      }
    | { state: 'TAKEN' | 'EXPIRED'; restaurantName: string }

export type CourierDeliveryStatus =
    'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED'

export type CourierFailureReason =
    'CUSTOMER_UNREACHABLE' | 'WRONG_ADDRESS' | 'CUSTOMER_REJECTED' | 'OTHER'

export type Coordinates = { latitude: number; longitude: number }

export type CourierDelivery = {
    status: CourierDeliveryStatus
    isActive: boolean
    orderNumber: number
    restaurant: { name: string; address: string | null; location: Coordinates | null }
    /** El backend solo manda el teléfono mientras la entrega está activa. */
    customer: { name: string | null; phone: string | null }
    address: string
    neighborhood: string | null
    reference: string | null
    destination: Coordinates
    distanceKm: number
    notes: string | null
    items: Array<{ quantity: number; name: string; options: string[] }>
    money: {
        paymentMethod: 'CASH' | 'TRANSFER'
        foodTotal: number
        amountCourierAdvances: number
        amountCourierCollects: number
        courierEarnings: number
    }
    failureReason: CourierFailureReason | null
    acceptedAt: string | null
    handedOffAt: string | null
    deliveredAt: string | null
    failedAt: string | null
    cancelledAt: string | null
}

/** Estados del link que la página muestra como pantalla propia (no como error genérico). */
export type CourierLinkProblem = 'not_found' | 'expired' | 'taken'

/** Traduce los errores conocidos del backend; el resto es un error de red o servidor. */
export function courierLinkProblem(error: unknown): CourierLinkProblem | null {
    const apiError = normalizeApiError(error)
    if (apiError.code === 'DELIVERY_ALREADY_TAKEN') return 'taken'
    if (apiError.code === 'DELIVERY_LINK_EXPIRED' || apiError.status === 410) return 'expired'
    if (apiError.code === 'DELIVERY_LINK_NOT_FOUND' || apiError.status === 404) return 'not_found'
    return null
}

const path = (token: string) => encodeURIComponent(token)

export async function getCourierOffer(token: string) {
    const { data } = await publicApiClient.get<{ offer: CourierOffer }>(
        `/public/deliveries/offer/${path(token)}`,
    )
    return data.offer
}

export async function claimCourierOffer(token: string, courier: { name: string; phone: string }) {
    const { data } = await publicApiClient.post<{ courierToken: string }>(
        `/public/deliveries/offer/${path(token)}/claim`,
        courier,
    )
    return data.courierToken
}

export async function getCourierDelivery(token: string) {
    const { data } = await publicApiClient.get<{ delivery: CourierDelivery }>(
        `/public/deliveries/courier/${path(token)}`,
    )
    return data.delivery
}

export async function completeCourierDelivery(token: string) {
    await publicApiClient.post(`/public/deliveries/courier/${path(token)}/delivered`)
}

export async function failCourierDelivery(token: string, reason: CourierFailureReason) {
    await publicApiClient.post(`/public/deliveries/courier/${path(token)}/failed`, { reason })
}
