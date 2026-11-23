import type { DeliveryFailureReason, Order } from '@/src/lib/api/order-types'
import {
    formatMoney,
    normalizeMexicanWhatsAppNumber,
} from '../../../../../menu/[slug]/features/public-menu/whatsapp'

/** Una oferta sin tomar por más de este tiempo muestra un aviso discreto en la tarjeta. */
export const UNTAKEN_OFFER_WARNING_MS = 5 * 60 * 1000

/** Link público de la oferta (página del repartidor, sin login). */
export function courierOfferLink(origin: string, offerToken: string) {
    return `${origin.replace(/\/$/, '')}/e/${offerToken}`
}

/** Mensaje para compartir con repartidores. NUNCA incluye datos del cliente. */
export function courierOfferMessage({
    businessName,
    deliveryFee,
    link,
}: {
    businessName: string
    deliveryFee: number
    link: string
}) {
    return `Pedido a domicilio de ${businessName}. Ganas $${formatMoney(deliveryFee)}. Tómalo aquí: ${link}`
}

export function whatsappShareUrl(message: string) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`
}

/**
 * Aviso "En camino" al cliente. No hay WhatsApp automático: el dueño lo envía desde su
 * WhatsApp con este mensaje ya escrito (igual que "Enviar tarjeta").
 */
export function onTheWayMessage({
    customerName,
    businessName,
    orderNumber,
    courierName,
    amountToPay,
}: {
    customerName: string | null
    businessName: string
    orderNumber: number
    courierName: string | null
    amountToPay: number
}) {
    const greeting = customerName?.trim() ? `Hola ${customerName.trim()}` : 'Hola'
    const number = String(orderNumber).padStart(3, '0')
    const courier = courierName?.trim() ? ` Te lo lleva ${courierName.trim()}.` : ''
    const payment =
        amountToPay > 0 ? ` Ten listos $${formatMoney(amountToPay)} para pagarle al recibirlo.` : ''
    return `${greeting}, tu pedido #${number} de ${businessName} ya va en camino.${courier}${payment}`
}

/** wa.me directo al cliente; null si su teléfono no es un número de México válido. */
export function customerWhatsAppUrl(phone: string | null | undefined, message: string) {
    const number = normalizeMexicanWhatsAppNumber(phone)
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null
}

/**
 * Comparte con el menú nativo del teléfono (navigator.share) y, si no existe o falla,
 * abre WhatsApp. Si el navegador bloquea la ventana, la tarjeta conserva el botón
 * "Compartir" para hacerlo con un toque.
 */
export async function shareCourierOffer(
    message: string,
): Promise<'shared' | 'cancelled' | 'whatsapp'> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({ text: message })
            return 'shared'
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
        }
    }
    window.open(whatsappShareUrl(message), '_blank', 'noopener,noreferrer')
    return 'whatsapp'
}

export function isHomeDelivery(order: Pick<Order, 'fulfillmentType'>) {
    return order.fulfillmentType === 'DELIVERY'
}

/** Transferencia sin confirmar: no se puede buscar repartidor todavía. */
export function needsTransferConfirmation(
    order: Pick<Order, 'fulfillmentType' | 'paymentMethod' | 'transferConfirmedAt' | 'status'>,
) {
    return (
        isHomeDelivery(order) &&
        order.paymentMethod === 'TRANSFER' &&
        !order.transferConfirmedAt &&
        order.status !== 'CANCELLED' &&
        order.status !== 'DELIVERED'
    )
}

/** "Buscar repartidor": pedido aceptado, sin entrega previa y con el pago listo. */
export function canFindCourier(
    order: Pick<
        Order,
        'fulfillmentType' | 'paymentMethod' | 'transferConfirmedAt' | 'status' | 'dispatch'
    >,
) {
    return (
        isHomeDelivery(order) &&
        (order.status === 'PREPARING' || order.status === 'READY') &&
        !order.dispatch &&
        !needsTransferConfirmation(order)
    )
}

export function isOfferUntakenTooLong(
    dispatch: NonNullable<Order['dispatch']> | null | undefined,
    now: number,
) {
    if (!dispatch || dispatch.status !== 'PENDING') return false
    const createdAt = new Date(dispatch.offerCreatedAt).getTime()
    return Number.isFinite(createdAt) && now - createdAt > UNTAKEN_OFFER_WARNING_MS
}

/**
 * Reglas de cancelación (las mismas que valida el backend). Para pedidos que no son a
 * domicilio se conserva el comportamiento anterior de la comanda.
 */
export function canCancelOrder(order: Pick<Order, 'status' | 'fulfillmentType' | 'dispatch'>) {
    if (!isHomeDelivery(order)) return order.status !== 'CANCELLED'
    if (order.status === 'OUT_FOR_DELIVERY') return order.dispatch?.status === 'FAILED'
    return order.status === 'PENDING' || order.status === 'PREPARING' || order.status === 'READY'
}

/** Cancelar con un repartidor asignado le quita la entrega: se pide confirmación. */
export function cancelNeedsConfirmation(order: Pick<Order, 'fulfillmentType' | 'dispatch'>) {
    return isHomeDelivery(order) && order.dispatch?.status === 'ACCEPTED'
}

export const failureReasonLabels: Record<DeliveryFailureReason, string> = {
    CUSTOMER_UNREACHABLE: 'El cliente no contesta',
    WRONG_ADDRESS: 'Dirección incorrecta',
    CUSTOMER_REJECTED: 'El cliente rechazó el pedido',
    OTHER: 'Otro motivo',
}

/** "Av. del Mar 100, Col. Centro" (sin repetir el prefijo si el cliente ya lo escribió). */
export function deliveryAddressLine(delivery: NonNullable<Order['delivery']>) {
    const neighborhood = delivery.neighborhood?.trim()
    if (!neighborhood) return delivery.address
    const label = /^(colonia(\s+|$)|col\.\s*|col(\s+|$))/i.test(neighborhood)
        ? neighborhood
        : `Col. ${neighborhood}`
    return `${delivery.address}, ${label}`
}

export function deliveryMapsUrl(delivery: NonNullable<Order['delivery']>) {
    return `https://www.google.com/maps?q=${delivery.latitude},${delivery.longitude}`
}
