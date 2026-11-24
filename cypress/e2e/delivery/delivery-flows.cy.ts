import { CUSTOMER, createDeliveryOrder, createOffer, getOrder, loginOwner } from './deliveryApi'
import {
    type DeliverySeed,
    loginAsDeliveryOwner,
    seedDelivery,
    stubMapServices,
} from './deliverySupport'

// Flujos completos de punta a punta, por la interfaz: comanda (dueño) → link compartido →
// página del repartidor → comanda. El pedido entra por la API pública, igual que el checkout
// (el checkout en sí se prueba en checkout.cy.ts, incluidos "fuera del radio" y "cambio de envío").
// Escenario del seed: 2 × $100 de comida, envío $50.

let seed: DeliverySeed

type Order = { id: string; orderNumber: number }
type Courier = { name: string; phone: string }

const COURIER_A: Courier = { name: 'Ana Repartidora', phone: '6691230001' }
const COURIER_B: Courier = { name: 'Beto Repartidor', phone: '6691230002' }

function orderCard(order: Order) {
    return cy.contains('article', `#${String(order.orderNumber).padStart(3, '0')}`)
}

/** Comanda con el menú de compartir del teléfono simulado (captura el mensaje). */
function visitOrders() {
    loginAsDeliveryOwner(seed)
    cy.visit('/dashboard/orders', {
        onBeforeLoad(win) {
            Object.defineProperty(win.navigator, 'share', {
                configurable: true,
                value: cy.stub().as('share').resolves(),
            })
        },
    })
}

/** Ruta /e/:token del último mensaje compartido desde la comanda. */
function lastSharedOfferPath(): Cypress.Chainable<string> {
    return cy.get('@share').then((share) => {
        const stub = share as unknown as sinon.SinonStub
        expect(stub.called, 'se compartió la oferta').to.eq(true)
        const text: string = stub.lastCall.args[0].text
        const match = text.match(/(\/e\/[A-Za-z0-9_-]+)$/)
        expect(match, 'link de la oferta en el mensaje').not.to.eq(null)
        return match![1]
    })
}

/** El repartidor abre el link en un teléfono "nuevo" (sin datos guardados) y la toma. */
function courierTakes(offerPath: string, courier: Courier): Cypress.Chainable<string> {
    stubMapServices()
    cy.visit(offerPath, { onBeforeLoad: (win) => win.localStorage.clear() })
    cy.get('[data-cy="courier-name"]').type(courier.name)
    cy.get('[data-cy="courier-phone"]').type(courier.phone)
    cy.get('[data-cy="courier-claim"]').click()
    cy.location('pathname').should('match', /^\/entrega\/[A-Za-z0-9_-]+$/)
    return cy.location('pathname')
}

function visitCourier(path: string) {
    stubMapServices()
    cy.visit(path)
}

/** Pedido nuevo (pendiente) aceptado desde la comanda con "Preparar". */
function acceptFromComanda(paymentMethod: 'CASH' | 'TRANSFER' = 'CASH') {
    loginOwner(seed)
    return createDeliveryOrder(seed, paymentMethod).then((order: Order) => {
        visitOrders()
        orderCard(order).contains('button', 'Preparar').click()
        orderCard(order).should('contain', 'En preparación')
        return cy.wrap(order)
    })
}

describe('Entregas · flujos completos', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    it('efectivo: buscar, tomar, entregar al repartidor, avisar y entregar', () => {
        acceptFromComanda().then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()
            orderCard(order)
                .find('[data-cy="delivery-status"]')
                .should('contain', 'Buscando repartidor')

            lastSharedOfferPath().then((offerPath) => {
                courierTakes(offerPath, COURIER_A).then((courierPath) => {
                    cy.get('[data-cy="courier-pickup-note"]').should(
                        'contain',
                        'Al recoger, paga $200.00 al restaurante',
                    )

                    visitOrders()
                    orderCard(order).within(() => {
                        cy.get('[data-cy="delivery-courier"]').should('contain', COURIER_A.name)
                        cy.get('[data-cy="delivery-handoff"]').click()
                        cy.get('[data-cy="delivery-handoff-confirm"]').click()
                        cy.get('[data-cy="delivery-courier"]').should('contain', 'En camino con')
                        cy.get('[data-cy="delivery-notify-customer"]')
                            .should('have.attr', 'href')
                            .and('contain', `https://wa.me/52${CUSTOMER.phone}?text=`)
                    })

                    visitCourier(courierPath)
                    cy.get('[data-cy="courier-delivery-title"]').should(
                        'have.text',
                        'Lleva el pedido al cliente',
                    )
                    cy.get('[data-cy="courier-money-collects"]').should('have.text', '$250.00')
                    cy.get('[data-cy="courier-delivered"]').click()
                    cy.get('[data-cy="courier-confirm-delivered"]').click()
                    cy.get('[data-cy="courier-delivered-state"]').should('be.visible')

                    visitOrders()
                    orderCard(order)
                        .find('[data-cy="delivery-status"]')
                        .should('contain', `Entregado por ${COURIER_A.name}`)
                    getOrder(order.id).its('status').should('eq', 'DELIVERED')
                })
            })
        })
    })

    it('transferencia: sin confirmarla no se busca repartidor; luego el repartidor no adelanta', () => {
        acceptFromComanda('TRANSFER').then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').should('not.exist')
            createOffer(order.id).then((response) => {
                expect(response.status).to.eq(409)
                expect(response.body.error.code).to.eq('DELIVERY_TRANSFER_NOT_CONFIRMED')
            })

            orderCard(order).find('[data-cy="delivery-confirm-transfer"]').click()
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()

            lastSharedOfferPath().then((offerPath) => {
                stubMapServices()
                cy.visit(offerPath, { onBeforeLoad: (win) => win.localStorage.clear() })
                cy.get('[data-cy="courier-offer-advance"]').should('have.text', 'Nada')

                courierTakes(offerPath, COURIER_A).then((courierPath) => {
                    cy.get('[data-cy="courier-pickup-note"]').should(
                        'contain',
                        'No tienes que pagar nada al recoger',
                    )
                    cy.get('[data-cy="courier-money-advances"]').should('have.text', '$0.00')
                    cy.get('[data-cy="courier-money-collects"]').should('have.text', '$50.00')
                    cy.get('[data-cy="courier-money-transfer"]').should('be.visible')

                    visitOrders()
                    orderCard(order).within(() => {
                        cy.get('[data-cy="delivery-handoff"]').should(
                            'have.text',
                            'Entregado al repartidor',
                        )
                        cy.get('[data-cy="delivery-handoff"]').click()
                        cy.get('[data-cy="delivery-handoff-confirm"]').click()
                        cy.get('[data-cy="delivery-courier"]').should('contain', 'En camino con')
                    })

                    visitCourier(courierPath)
                    cy.get('[data-cy="courier-delivered"]').click()
                    cy.get('[data-cy="courier-confirm-delivered"]').click()
                    cy.get('[data-cy="courier-delivered-state"]').should('be.visible')
                    getOrder(order.id).its('status').should('eq', 'DELIVERED')
                })
            })
        })
    })

    it('ya tomada: el segundo repartidor ve que alguien más la tomó', () => {
        acceptFromComanda().then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()
            lastSharedOfferPath().then((offerPath) => {
                courierTakes(offerPath, COURIER_A)

                stubMapServices()
                cy.visit(offerPath, { onBeforeLoad: (win) => win.localStorage.clear() })
                cy.get('[data-cy="courier-offer-taken"]').should('be.visible')
                cy.get('[data-cy="courier-claim"]').should('not.exist')

                getOrder(order.id).its('dispatch.courier.name').should('eq', COURIER_A.name)
            })
        })
    })

    it('liberar y retomar: el primer link deja de servir y otro repartidor la toma', () => {
        acceptFromComanda().then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()
            lastSharedOfferPath().then((firstOfferPath) => {
                courierTakes(firstOfferPath, COURIER_A).then((firstCourierPath) => {
                    visitOrders()
                    orderCard(order).within(() => {
                        cy.get('[data-cy="delivery-release"]').click()
                        cy.get('[data-cy="delivery-release-confirm"]').click()
                        cy.get('[data-cy="delivery-status"]').should(
                            'contain',
                            'Buscando repartidor',
                        )
                        cy.get('[data-cy="delivery-share"]').click()
                    })

                    visitCourier(firstCourierPath)
                    cy.get('[data-cy="courier-delivery-invalid"]').should('be.visible')

                    lastSharedOfferPath().then((secondOfferPath) => {
                        expect(secondOfferPath).not.to.eq(firstOfferPath)
                        courierTakes(secondOfferPath, COURIER_B)
                        cy.get('[data-cy="courier-delivery-title"]').should(
                            'have.text',
                            'Recoge el pedido',
                        )
                        visitOrders()
                        orderCard(order)
                            .find('[data-cy="delivery-courier"]')
                            .should('contain', COURIER_B.name)
                            .and('not.contain', COURIER_A.name)
                    })
                })
            })
        })
    })

    it('falla de entrega: el repartidor da el motivo y el dueño cancela el pedido', () => {
        acceptFromComanda().then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()
            lastSharedOfferPath().then((offerPath) => {
                courierTakes(offerPath, COURIER_A).then((courierPath) => {
                    visitOrders()
                    orderCard(order).find('[data-cy="delivery-handoff"]').click()
                    orderCard(order).find('[data-cy="delivery-handoff-confirm"]').click()
                    orderCard(order)
                        .find('[data-cy="delivery-courier"]')
                        .should('contain', 'En camino con')

                    visitCourier(courierPath)
                    cy.get('[data-cy="courier-failed"]').click()
                    cy.get('[data-cy="courier-reason-CUSTOMER_REJECTED"]').click()
                    cy.get('[data-cy="courier-confirm-failed"]').click()
                    cy.get('[data-cy="courier-failed-reason"]').should(
                        'contain',
                        'El cliente rechazó el pedido',
                    )

                    visitOrders()
                    orderCard(order).within(() => {
                        cy.get('[data-cy="delivery-status"]').should(
                            'contain',
                            'No se pudo entregar · El cliente rechazó el pedido',
                        )
                        cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).click()
                        cy.contains('Cancelado').should('be.visible')
                    })
                    getOrder(order.id).its('status').should('eq', 'CANCELLED')
                })
            })
        })
    })

    it('cancelar antes de que la tomen: el link compartido ya no está disponible', () => {
        acceptFromComanda().then((order) => {
            orderCard(order).find('[data-cy="delivery-find-courier"]').click()
            orderCard(order)
                .find('[data-cy="delivery-status"]')
                .should('contain', 'Buscando repartidor')
            lastSharedOfferPath().then((offerPath) => {
                orderCard(order).within(() => {
                    cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).click()
                    cy.contains('Cancelado').should('be.visible')
                })

                stubMapServices()
                cy.visit(offerPath, { onBeforeLoad: (win) => win.localStorage.clear() })
                cy.get('[data-cy="courier-offer-expired"]').should(
                    'contain',
                    'Esta entrega ya no está disponible',
                )
                cy.get('[data-cy="courier-claim"]').should('not.exist')
            })
        })
    })
})
