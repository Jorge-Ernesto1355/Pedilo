// Helpers de API de entregas para las pruebas (no es un spec). Usan el negocio del seed.
// Los tipos de las respuestas se infieren de cy.request (cuerpo sin tipar de Cypress).
import {
    backendApi,
    DELIVERY_PASSWORD,
    DELIVERY_SEED_PRODUCT,
    type DeliverySeed,
    pointAtRoadKm,
} from './deliverySupport'

export const CUSTOMER = {
    name: 'Cliente API',
    phone: '6691112233',
    address: 'Av. del Mar 100',
    neighborhood: 'Centro',
    reference: 'Portón azul',
}

/** Pin a 3.4 km del restaurante: tramo "hasta 5 km" → envío $50. */
export const DELIVERY_KM = 3.4
export const DELIVERY_FEE = 50

type CatalogBody = {
    menus?: { categories?: { products?: { id: string; name: string }[] }[] }[]
}

let courierSequence = 0
/** Repartidor nuevo por prueba (teléfono de 10 dígitos que no choca entre corridas). */
export function newCourier() {
    courierSequence += 1
    const suffix = `${Date.now() % 1_000_000}`.padStart(6, '0')
    return {
        name: `Repartidor ${courierSequence}`,
        phone: `66${suffix}${String(courierSequence % 100).padStart(2, '0')}`,
    }
}

export function loginOwner(seed: DeliverySeed) {
    return backendApi('/auth/login').then((url) =>
        cy.request('POST', url, { email: seed.email, password: DELIVERY_PASSWORD }),
    )
}

export function productId(seed: DeliverySeed): Cypress.Chainable<string> {
    return backendApi(`/public/businesses/${seed.slug}/catalog`).then((url) =>
        cy.request(url).then((response) => {
            const body: CatalogBody = response.body.data ?? response.body
            const products = (body.menus ?? []).flatMap((menu) =>
                (menu.categories ?? []).flatMap((category) => category.products ?? []),
            )
            const product = products.find((item) => item.name === DELIVERY_SEED_PRODUCT.name)
            expect(product, 'producto del seed').not.to.equal(undefined)
            return product!.id
        }),
    )
}

/** Cuerpo del pedido público a domicilio (2 × $100 = $200 de comida, envío $50). */
export function deliveryOrderBody(
    productId: string,
    seed: DeliverySeed,
    paymentMethod: 'CASH' | 'TRANSFER' = 'CASH',
) {
    return {
        customer: { name: CUSTOMER.name, phone: CUSTOMER.phone },
        items: [{ productId, quantity: 2 }],
        fulfillmentType: 'DELIVERY',
        ...(paymentMethod === 'TRANSFER' ? { paymentMethod } : {}),
        delivery: {
            address: CUSTOMER.address,
            neighborhood: CUSTOMER.neighborhood,
            reference: CUSTOMER.reference,
            ...pointAtRoadKm(seed.origin, DELIVERY_KM),
        },
        expectedDeliveryFee: DELIVERY_FEE,
    }
}

/** Crea un pedido público a domicilio (2 × $100 = $200 de comida, envío $50). */
export function createDeliveryOrder(
    seed: DeliverySeed,
    paymentMethod: 'CASH' | 'TRANSFER' = 'CASH',
) {
    return productId(seed).then((id) =>
        backendApi(`/businesses/${seed.businessId}/orders`).then((url) =>
            cy
                .request('POST', url, deliveryOrderBody(id, seed, paymentMethod))
                .then((response) => response.body.order),
        ),
    )
}

export function setOrderStatus(orderId: string, status: string) {
    return backendApi(`/businesses/orders/${orderId}/status`).then((url) =>
        cy.request({ method: 'PATCH', url, body: { status }, failOnStatusCode: false }),
    )
}

export function getOrder(orderId: string) {
    return backendApi(`/businesses/orders/${orderId}`).then((url) =>
        cy.request(url).then((response) => response.body.order ?? response.body),
    )
}

export function ownerPost(path: string) {
    return backendApi(path).then((url) =>
        cy.request({ method: 'POST', url, failOnStatusCode: false }),
    )
}

export function createOffer(orderId: string) {
    return ownerPost(`/businesses/orders/${orderId}/delivery`)
}

export function confirmTransfer(orderId: string) {
    return backendApi(`/businesses/orders/${orderId}/transfer-received`).then((url) =>
        cy.request({ method: 'PATCH', url, failOnStatusCode: false }),
    )
}

export function viewOffer(token: string) {
    return backendApi(`/public/deliveries/offer/${token}`).then((url) =>
        cy.request({ url, failOnStatusCode: false }),
    )
}

export function claimOffer(token: string, courier: { name: string; phone: string }) {
    return backendApi(`/public/deliveries/offer/${token}/claim`).then((url) =>
        cy.request({ method: 'POST', url, body: courier, failOnStatusCode: false }),
    )
}

export function courierDetail(token: string) {
    return backendApi(`/public/deliveries/courier/${token}`).then((url) =>
        cy.request({ url, failOnStatusCode: false }),
    )
}

export function courierAction(
    token: string,
    action: 'delivered' | 'failed',
    body?: Record<string, unknown>,
) {
    return backendApi(`/public/deliveries/courier/${token}/${action}`).then((url) =>
        cy.request({ method: 'POST', url, body, failOnStatusCode: false }),
    )
}

/** Pedido aceptado (en preparación) con oferta publicada. */
export function offeredOrder(seed: DeliverySeed, paymentMethod: 'CASH' | 'TRANSFER' = 'CASH') {
    loginOwner(seed)
    return createDeliveryOrder(seed, paymentMethod).then((order) => {
        setOrderStatus(order.id, 'PREPARING').its('status').should('eq', 200)
        if (paymentMethod === 'TRANSFER') confirmTransfer(order.id).its('status').should('eq', 200)
        return createOffer(order.id).then((response) => {
            expect(response.status, 'crear oferta').to.eq(201)
            return { order, offerToken: response.body.offerToken as string }
        })
    })
}

/** Pedido con la entrega tomada por un repartidor. */
export function acceptedOrder(seed: DeliverySeed) {
    return offeredOrder(seed).then(({ order, offerToken }) =>
        claimOffer(offerToken, newCourier()).then((response) => {
            expect(response.status, 'tomar').to.eq(201)
            return { order, offerToken, courierToken: response.body.courierToken as string }
        }),
    )
}

/** Pedido "En camino": el dueño ya entregó al repartidor. */
export function pickedUpOrder(seed: DeliverySeed) {
    return acceptedOrder(seed).then((result) =>
        ownerPost(`/businesses/orders/${result.order.id}/delivery/handoff`).then((response) => {
            expect(response.status, 'entregar al repartidor').to.eq(200)
            return result
        }),
    )
}
