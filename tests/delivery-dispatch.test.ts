import { describe, expect, it } from 'vitest'
import type { Order, OrderDispatch } from '@/src/lib/api/order-types'
import {
    canCancelOrder,
    canFindCourier,
    cancelNeedsConfirmation,
    courierOfferLink,
    courierOfferMessage,
    customerWhatsAppUrl,
    deliveryAddressLine,
    isOfferUntakenTooLong,
    needsTransferConfirmation,
    onTheWayMessage,
    whatsappShareUrl,
} from '@/app/(protected)/dashboard/features/orders/delivery/deliveryDispatch'

type OrderFields = Pick<
    Order,
    'status' | 'fulfillmentType' | 'paymentMethod' | 'transferConfirmedAt' | 'dispatch'
>

function dispatch(overrides: Partial<OrderDispatch> = {}): OrderDispatch {
    return {
        status: 'PENDING',
        offerCreatedAt: '2026-11-22T18:00:00.000Z',
        offerExpiresAt: '2026-11-22T19:00:00.000Z',
        acceptedAt: null,
        handedOffAt: null,
        deliveredAt: null,
        failedAt: null,
        cancelledAt: null,
        failureReason: null,
        foodTotal: 200,
        deliveryFee: 50,
        paymentMethod: 'CASH',
        amountCourierAdvances: 200,
        amountCourierCollects: 250,
        courier: null,
        ...overrides,
    }
}

function order(overrides: Partial<OrderFields> = {}): OrderFields {
    return {
        status: 'PREPARING',
        fulfillmentType: 'DELIVERY',
        paymentMethod: 'CASH',
        transferConfirmedAt: null,
        dispatch: null,
        ...overrides,
    }
}

describe('mensaje para repartidores', () => {
    it('lleva restaurante, ganancia y link, sin datos del cliente', () => {
        const link = courierOfferLink('https://pedilo.mx/', 'abc123')
        expect(link).toBe('https://pedilo.mx/e/abc123')
        expect(courierOfferMessage({ businessName: 'Tacos El Faro', deliveryFee: 50, link })).toBe(
            'Pedido a domicilio de Tacos El Faro. Ganas $50.00. Tómalo aquí: https://pedilo.mx/e/abc123',
        )
    })

    it('el respaldo de WhatsApp codifica el mensaje', () => {
        expect(whatsappShareUrl('Ganas $50 aquí')).toBe(
            'https://wa.me/?text=Ganas%20%2450%20aqu%C3%AD',
        )
    })
})

describe('buscar repartidor', () => {
    it('solo con el pedido aceptado y sin entrega previa', () => {
        expect(canFindCourier(order())).toBe(true)
        expect(canFindCourier(order({ status: 'READY' }))).toBe(true)
        expect(canFindCourier(order({ status: 'PENDING' }))).toBe(false)
        expect(canFindCourier(order({ dispatch: dispatch() }))).toBe(false)
        expect(canFindCourier(order({ fulfillmentType: 'PICKUP' }))).toBe(false)
    })

    it('por transferencia exige marcarla como recibida', () => {
        const transfer = order({ paymentMethod: 'TRANSFER' })
        expect(needsTransferConfirmation(transfer)).toBe(true)
        expect(canFindCourier(transfer)).toBe(false)
        const confirmed = order({
            paymentMethod: 'TRANSFER',
            transferConfirmedAt: '2026-11-22T18:00:00.000Z',
        })
        expect(needsTransferConfirmation(confirmed)).toBe(false)
        expect(canFindCourier(confirmed)).toBe(true)
    })
})

describe('aviso de oferta sin tomar', () => {
    const created = new Date('2026-11-22T18:00:00.000Z').getTime()

    it('aparece después de 5 minutos, no antes', () => {
        expect(isOfferUntakenTooLong(dispatch(), created + 5 * 60_000)).toBe(false)
        expect(isOfferUntakenTooLong(dispatch(), created + 5 * 60_000 + 1)).toBe(true)
    })

    it('no aplica si ya la tomaron', () => {
        expect(isOfferUntakenTooLong(dispatch({ status: 'ACCEPTED' }), created + 60 * 60_000)).toBe(
            false,
        )
    })
})

describe('cancelar', () => {
    it('pedidos que no son a domicilio conservan la regla anterior', () => {
        expect(canCancelOrder(order({ fulfillmentType: 'PICKUP', status: 'READY' }))).toBe(true)
        expect(canCancelOrder(order({ fulfillmentType: 'DINE_IN', status: 'CANCELLED' }))).toBe(
            false,
        )
    })

    it('a domicilio: en camino solo si la entrega falló; entregado nunca', () => {
        expect(canCancelOrder(order({ status: 'READY' }))).toBe(true)
        expect(
            canCancelOrder(
                order({ status: 'OUT_FOR_DELIVERY', dispatch: dispatch({ status: 'PICKED_UP' }) }),
            ),
        ).toBe(false)
        expect(
            canCancelOrder(
                order({ status: 'OUT_FOR_DELIVERY', dispatch: dispatch({ status: 'FAILED' }) }),
            ),
        ).toBe(true)
        expect(canCancelOrder(order({ status: 'DELIVERED' }))).toBe(false)
    })

    it('pide confirmación si un repartidor ya tomó la entrega', () => {
        expect(cancelNeedsConfirmation(order({ dispatch: dispatch({ status: 'ACCEPTED' }) }))).toBe(
            true,
        )
        expect(cancelNeedsConfirmation(order({ dispatch: dispatch() }))).toBe(false)
    })
})

describe('dirección en la comanda', () => {
    const base = {
        address: 'Av. del Mar 100',
        reference: null,
        latitude: 1,
        longitude: 1,
        distanceKm: 3,
    }

    it('agrega la colonia sin repetir el prefijo', () => {
        expect(deliveryAddressLine({ ...base, neighborhood: 'Centro' })).toBe(
            'Av. del Mar 100, Col. Centro',
        )
        expect(deliveryAddressLine({ ...base, neighborhood: 'Col. Centro' })).toBe(
            'Av. del Mar 100, Col. Centro',
        )
        expect(deliveryAddressLine({ ...base, neighborhood: 'Colosio' })).toBe(
            'Av. del Mar 100, Col. Colosio',
        )
        expect(deliveryAddressLine({ ...base, neighborhood: null })).toBe('Av. del Mar 100')
    })
})

describe('aviso "En camino" al cliente', () => {
    const base = {
        customerName: 'Ana',
        businessName: 'Tacos Don Pepe',
        orderNumber: 12,
        courierName: 'Luis',
        amountToPay: 250,
    }

    it('dice quién lo lleva y cuánto pagar', () => {
        expect(onTheWayMessage(base)).toBe(
            'Hola Ana, tu pedido #012 de Tacos Don Pepe ya va en camino. Te lo lleva Luis. Ten listos $250.00 para pagarle al recibirlo.',
        )
    })

    it('sin monto a pagar no menciona dinero', () => {
        expect(onTheWayMessage({ ...base, amountToPay: 0 })).toBe(
            'Hola Ana, tu pedido #012 de Tacos Don Pepe ya va en camino. Te lo lleva Luis.',
        )
    })

    it('sin nombre del cliente saluda sin nombre', () => {
        expect(onTheWayMessage({ ...base, customerName: null })).toMatch(/^Hola, tu pedido/)
    })

    it('abre WhatsApp al teléfono del cliente con lada 52', () => {
        expect(customerWhatsAppUrl('669 111 2233', 'Hola')).toBe(
            'https://wa.me/526691112233?text=Hola',
        )
        expect(customerWhatsAppUrl('123', 'Hola')).toBeNull()
        expect(customerWhatsAppUrl(null, 'Hola')).toBeNull()
    })
})
