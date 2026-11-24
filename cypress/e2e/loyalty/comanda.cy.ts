// Tarjeta de lealtad en la comanda (/dashboard/orders) y en "Nueva orden". Fase 6.
import {
    asOwner,
    availableReward,
    cardDetail,
    createCustomer,
    customerWithStamps,
    finishedOrder,
    loginOwnerUi,
    type LoyaltySeed,
    owner,
    publicOrder,
    saveProgram,
    seedLoyalty,
    setStatus,
    stampOrder,
    type SeedCustomer,
} from './loyaltySupport'

let seed: LoyaltySeed

type OrderRef = { id: string; orderNumber: number }

function orderRef(orderId: string): Cypress.Chainable<OrderRef> {
    return owner('GET', `/businesses/orders/${orderId}`).then((response) => ({
        id: orderId,
        orderNumber: response.body.order.orderNumber as number,
    }))
}

function orderCard(order: OrderRef) {
    // La lista va de la más nueva a la más vieja: el pedido de la prueba está arriba.
    return cy.contains('article', `#${String(order.orderNumber).padStart(3, '0')}`)
}

function visitOrders() {
    loginOwnerUi(seed.a)
    // Se espera la lista del negocio A (la sesión guardada pudo ser de otra cuenta).
    cy.intercept('GET', `**/api/v1/businesses/${seed.a.businessId}/orders*`).as('orders')
    cy.visit('/dashboard/orders')
    cy.wait('@orders')
}

/** Pedido público del cliente en preparación (listo para "Marcar listo" en la comanda). */
function preparingOrder(customer: SeedCustomer): Cypress.Chainable<OrderRef> {
    return publicOrder(seed.a, { customer }).then((created) => {
        const order = {
            id: created.body.order.id as string,
            orderNumber: created.body.order.orderNumber as number,
        }
        return setStatus(order.id, 'PREPARING').then((response) => {
            expect(response.status).to.eq(200)
            return order
        })
    })
}

function toast() {
    return cy.get('[data-sileo-viewport]')
}

/** Los avisos de sileo se contraen: el botón aparece al expandirlos (hover o toque). */
function toastButton(title: string) {
    cy.get('[data-sileo-toast]').last().trigger('mouseenter').trigger('mousemove')
    return toast().contains('[data-sileo-button]', title)
}

describe('Lealtad · comanda', () => {
    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
    })

    it('un pedido finalizado con cliente muestra "Dar sello" y al darlo cambia a "Sello dado 1/8"', () => {
        createCustomer(seed.a, 'Ana Comanda').then((customer) => {
            finishedOrder(seed.a, customer)
                .then(orderRef)
                .then((order) => {
                    visitOrders()
                    cy.intercept('POST', `**/orders/${order.id}/stamp`).as('stamp')
                    orderCard(order).within(() => {
                        cy.get('[data-cy="order-loyalty-stamp"]')
                            .should('contain', 'Dar sello')
                            .click()
                        // Micro animación con el efecto del diseño.
                        cy.get('[data-cy="order-loyalty-mini-stamp"]').should(
                            'have.class',
                            'lc-fx-press',
                        )
                        cy.get('[data-cy="order-loyalty-stamped"]').should('contain', 'Sello dado')
                    })
                    cy.wait('@stamp').its('response.statusCode').should('eq', 201)
                    orderCard(order)
                        .find('[data-cy="order-loyalty-stamped"]')
                        .should('have.text', 'Sello dado 1/8')
                    toast().should('contain', 'Sello dado a Ana (1 de 8)')
                })
        })
    })

    it('un pedido ya sellado muestra su avance', () => {
        customerWithStamps(seed.a, 4).then((customer) => {
            finishedOrder(seed.a, customer).then((orderId) => {
                stampOrder(orderId).its('status').should('eq', 201)
                orderRef(orderId).then((order) => {
                    visitOrders()
                    orderCard(order)
                        .find('[data-cy="order-loyalty-stamped"]')
                        .should('have.text', 'Sello dado 5/8')
                    orderCard(order).find('[data-cy="order-loyalty-stamp"]').should('not.exist')
                })
            })
        })
    })

    it('modo manual: al finalizar aparece un aviso con "Dar sello" que no bloquea', () => {
        createCustomer(seed.a, 'Beto Manual').then((customer) => {
            preparingOrder(customer).then((order) => {
                visitOrders()
                orderCard(order).contains('button', 'Marcar listo').click()
                toast()
                    .should('contain', `Pedido #${order.orderNumber} listo`)
                    .and('contain', 'Puedes darle su sello a Beto.')
                // La comanda sigue usable mientras el aviso está a la vista.
                cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').should(
                    'be.enabled',
                )
                cy.intercept('POST', `**/orders/${order.id}/stamp`).as('stamp')
                toastButton('Dar sello').click({ force: true })
                cy.wait('@stamp').its('response.statusCode').should('eq', 201)
                orderCard(order)
                    .find('[data-cy="order-loyalty-stamped"]')
                    .should('have.text', 'Sello dado 1/8')
            })
        })
    })

    it('modo automático: al finalizar el aviso solo informa', () => {
        saveProgram({ stampMode: 'AUTO' })
        createCustomer(seed.a, 'Carla Auto').then((customer) => {
            preparingOrder(customer).then((order) => {
                visitOrders()
                orderCard(order).contains('button', 'Marcar listo').click()
                toast().should('contain', 'Sello dado a Carla (1 de 8)')
                toast().find('[data-sileo-button]').should('not.exist')
                orderCard(order)
                    .find('[data-cy="order-loyalty-stamped"]')
                    .should('have.text', 'Sello dado 1/8')
                cardDetail(customer.id).its('body.stamps.0.source').should('eq', 'ORDER_AUTO')
            })
        })
    })

    it('al completar la tarjeta avisa "premio disponible" con "Avisar por WhatsApp"', () => {
        customerWithStamps(seed.a, 7, 'Dani Completa').then((customer) => {
            finishedOrder(seed.a, customer)
                .then(orderRef)
                .then((order) => {
                    cardDetail(customer.id)
                        .its('body.card.cardToken')
                        .then((token) => {
                            visitOrders()
                            const popup = { opener: {}, location: { href: '' }, close: cy.stub() }
                            cy.window().then((window) => {
                                cy.stub(window, 'open').as('open').returns(popup)
                            })
                            orderCard(order).find('[data-cy="order-loyalty-stamp"]').click()
                            toast().should('contain', 'Dani completó su tarjeta, premio disponible')
                            toastButton('Avisar por WhatsApp').click({ force: true })
                            cy.get('@open').should('have.been.calledWith', 'about:blank', '_blank')
                            cy.wrap(popup.location)
                                .its('href')
                                .should(
                                    'match',
                                    new RegExp(`^https://wa\\.me/52${customer.phone}\\?text=`),
                                )
                                .then((href) => {
                                    const text = decodeURIComponent(String(href).split('?text=')[1])
                                    expect(text).to.contain(
                                        'Hola Dani, completaste tu tarjeta de lealtad de E2E Lealtad Café.',
                                    )
                                    expect(text).to.contain('Tu premio: 20% de descuento.')
                                    expect(text).to.contain(`/tarjeta/${token}`)
                                })
                            orderCard(order)
                                .find('[data-cy="order-loyalty-stamped"]')
                                .should('have.text', 'Sello dado 8/8')
                        })
                })
        })
    })

    it('si el servidor rechaza el sello, el chip se revierte y ofrece reintentar', () => {
        createCustomer(seed.a, 'Eli Error').then((customer) => {
            finishedOrder(seed.a, customer)
                .then(orderRef)
                .then((order) => {
                    visitOrders()
                    cy.intercept('POST', `**/orders/${order.id}/stamp`, {
                        statusCode: 409,
                        body: {
                            error: {
                                code: 'LOYALTY_PROGRAM_INACTIVE',
                                message: 'El programa de lealtad no está activo.',
                            },
                        },
                    }).as('stamp')
                    orderCard(order).find('[data-cy="order-loyalty-stamp"]').click()
                    cy.wait('@stamp')
                    toast().should('contain', 'El programa de lealtad no está activo.')
                    toastButton('Reintentar').should('exist')
                    orderCard(order).find('[data-cy="order-loyalty-stamp"]').should('be.enabled')
                    orderCard(order).find('[data-cy="order-loyalty-stamped"]').should('not.exist')
                })
        })
    })

    it('un pedido de mostrador sin cliente ofrece vincular uno en el detalle', () => {
        finishedOrder(seed.a, null)
            .then(orderRef)
            .then((order) => {
                visitOrders()
                orderCard(order).find('[data-cy="order-loyalty-stamp"]').should('not.exist')
                orderCard(order).find('button').first().click()
                cy.get('[data-cy="order-loyalty-link-open"]').click()
                cy.get('[data-cy="order-loyalty-link-name"]').type('Fito Mostrador')
                cy.get('[data-cy="order-loyalty-link-phone"]').type('66912')
                cy.get('[data-cy="order-loyalty-link-submit"]').click()
                cy.contains('El teléfono debe tener 10 dígitos.').should('be.visible')
                cy.get('[data-cy="order-loyalty-link-phone"]')
                    .clear()
                    .type(`66${String(Date.now()).slice(-8)}`)
                cy.intercept('POST', `**/orders/${order.id}/stamp`).as('stamp')
                cy.get('[data-cy="order-loyalty-link-submit"]').click()
                cy.wait('@stamp').its('response.statusCode').should('eq', 201)
                owner('GET', `/businesses/orders/${order.id}`)
                    .its('body.order.customerName')
                    .should('eq', 'Fito Mostrador')
            })
    })

    it('"Aplicar premio" en Nueva orden usa el canje del servidor', () => {
        customerWithStamps(seed.a, 8, 'Gina Premio').then((customer) => {
            availableReward(customer.id).then((reward) => {
                visitOrders()
                cy.contains('button', 'Nueva orden').click()
                cy.contains('E2E Lealtad Tacos')
                    .parentsUntil('[role="dialog"]')
                    .filter(':has(button:contains("Agregar al carrito"))')
                    .first()
                    .contains('button', 'Agregar al carrito')
                    .click()
                cy.contains('button', /^\s*Continuar\s*$/).click()
                cy.get('input[autocomplete="tel"]').type(customer.phone)
                cy.get('[data-cy="new-order-loyalty-reward"]').should('contain', '20% de descuento')
                cy.get('[data-cy="new-order-apply-reward"]').check()
                cy.intercept('POST', '**/orders/restaurant').as('create')
                cy.contains('button', 'Crear orden').click()
                cy.wait('@create').then(({ request, response }) => {
                    expect(request.body.loyaltyRewardId).to.eq(reward.id)
                    expect(response?.statusCode).to.eq(201)
                    expect(response?.body.order).to.include({
                        subtotal: 100,
                        loyaltyDiscountAmount: 20,
                        total: 80,
                    })
                })
                cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
            })
        })
    })

    it('sin regresiones: búsqueda, filtro por periodo, actualizar y cancelar siguen funcionando', () => {
        createCustomer(seed.a, 'Hugo Regresion').then((customer) => {
            publicOrder(seed.a, { customer }).then((created) => {
                const order = {
                    id: created.body.order.id as string,
                    orderNumber: created.body.order.orderNumber as number,
                }
                visitOrders()
                cy.intercept('GET', `**/orders?*search=${customer.phone}*`).as('search')
                cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').type(
                    customer.phone,
                )
                cy.wait('@search')
                orderCard(order).should('be.visible')
                cy.intercept('GET', '**/orders?*period=today*').as('today')
                cy.get('select[aria-label="Filtrar pedidos por periodo"]').select('today')
                cy.wait('@today')
                orderCard(order).should('be.visible')
                cy.get('button[aria-label="Actualizar pedidos"]').click()
                cy.wait('@orders')
                orderCard(order)
                    .find(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`)
                    .click()
                owner('GET', `/businesses/orders/${order.id}`)
                    .its('body.order.status')
                    .should('eq', 'CANCELLED')
            })
        })
    })

    it('con el programa pausado la comanda no muestra nada de lealtad', () => {
        saveProgram({ enabled: false })
        createCustomer(seed.a, 'Iván Pausa').then((customer) => {
            finishedOrder(seed.a, customer)
                .then(orderRef)
                .then((order) => {
                    visitOrders()
                    orderCard(order).should('be.visible')
                    orderCard(order).find('[data-cy="order-loyalty-stamp"]').should('not.exist')
                })
        })
    })
})
