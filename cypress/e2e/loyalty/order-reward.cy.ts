// Premio de lealtad pendiente al crear un pedido y en el detalle de un pedido.
//  - "Nueva orden": aviso de carga y de error mientras se busca el premio del cliente.
//  - Detalle del pedido: "este cliente tiene premio" (de antes / ganado con este pedido) y
//    "Aplicar al pedido" para canjearlo sin abrir la tarjeta del cliente.
import {
    asOwner,
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
    walkInStamp,
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
    return cy.contains('article', `#${String(order.orderNumber).padStart(3, '0')}`)
}

function visitOrders() {
    loginOwnerUi(seed.a)
    cy.intercept('GET', `**/api/v1/businesses/${seed.a.businessId}/orders*`).as('orders')
    cy.visit('/dashboard/orders')
    cy.wait('@orders')
}

function openDetail(order: OrderRef) {
    orderCard(order).find('button').first().click()
    cy.get('[role="dialog"]').should('be.visible')
}

/** Pedido público del cliente, todavía pendiente. */
function pendingOrder(customer: SeedCustomer): Cypress.Chainable<OrderRef> {
    return publicOrder(seed.a, { customer }).then((created) => {
        expect(created.status, JSON.stringify(created.body)).to.eq(201)
        return {
            id: created.body.order.id as string,
            orderNumber: created.body.order.orderNumber as number,
        }
    })
}

function toast() {
    return cy.get('[data-sileo-viewport]')
}

/** Abre "Nueva orden" con un producto en el carrito y llega al paso del cliente. */
function newOrderCustomerStep() {
    cy.contains('button', 'Nueva orden').click()
    cy.contains('E2E Lealtad Tacos')
        .parentsUntil('[role="dialog"]')
        .filter(':has(button:contains("Agregar al carrito"))')
        .first()
        .contains('button', 'Agregar al carrito')
        .click()
    cy.contains('button', /^\s*Continuar\s*$/).click()
}

describe('Lealtad · premio del cliente en pedidos', () => {
    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
    })

    describe('Nueva orden', () => {
        it('muestra "Buscando premio de lealtad…" mientras consulta y luego el premio', () => {
            customerWithStamps(seed.a, 8, 'Lola Carga').then((customer) => {
                visitOrders()
                cy.intercept('GET', '**/businesses/loyalty/cards?*', (request) => {
                    request.on('response', (response) => {
                        response.setDelay(1500)
                    })
                }).as('cards')
                newOrderCustomerStep()
                cy.get('[data-cy="new-order-loyalty-loading"]').should('not.exist')
                cy.get('input[autocomplete="tel"]').type(customer.phone)
                cy.get('[data-cy="new-order-loyalty-loading"]')
                    .should('be.visible')
                    .and('contain', 'Buscando premio de lealtad…')
                cy.get('[data-cy="new-order-loyalty-reward"]').should('contain', '20% de descuento')
                cy.get('[data-cy="new-order-loyalty-loading"]').should('not.exist')
            })
        })

        it('si el cliente no tiene premio, el aviso de carga desaparece sin dejar nada', () => {
            createCustomer(seed.a, 'Nico Sinpremio').then((customer) => {
                visitOrders()
                cy.intercept('GET', '**/businesses/loyalty/cards?*', (request) => {
                    request.on('response', (response) => {
                        response.setDelay(1200)
                    })
                }).as('cards')
                newOrderCustomerStep()
                cy.get('input[autocomplete="tel"]').type(customer.phone)
                cy.get('[data-cy="new-order-loyalty-loading"]').should('be.visible')
                cy.wait('@cards')
                cy.get('[data-cy="new-order-loyalty-loading"]').should('not.exist')
                cy.get('[data-cy="new-order-loyalty-reward"]').should('not.exist')
                cy.get('[data-cy="new-order-loyalty-error"]').should('not.exist')
            })
        })

        it('si la consulta falla avisa y "Reintentar" vuelve a buscar el premio', () => {
            customerWithStamps(seed.a, 8, 'Ema Error').then((customer) => {
                visitOrders()
                // La petición inicial y su único reintento automático fallan.
                cy.intercept(
                    { method: 'GET', url: '**/businesses/loyalty/cards?*', times: 2 },
                    {
                        statusCode: 500,
                        body: { error: { code: 'INTERNAL_ERROR', message: 'Error interno' } },
                    },
                ).as('cardsFail')
                newOrderCustomerStep()
                cy.get('input[autocomplete="tel"]').type(customer.phone)
                cy.get('[data-cy="new-order-loyalty-error"]')
                    .should('be.visible')
                    .and('contain', 'No pudimos revisar el premio de lealtad.')
                cy.get('[data-cy="new-order-loyalty-reward"]').should('not.exist')
                cy.contains('[data-cy="new-order-loyalty-error"] button', 'Reintentar').click()
                cy.get('[data-cy="new-order-loyalty-reward"]').should('contain', '20% de descuento')
                cy.get('[data-cy="new-order-loyalty-error"]').should('not.exist')
            })
        })

        it('con el programa pausado no busca ni muestra nada de lealtad', () => {
            saveProgram({ enabled: false })
            createCustomer(seed.a, 'Pau Pausa').then((customer) => {
                visitOrders()
                newOrderCustomerStep()
                cy.get('input[autocomplete="tel"]').type(customer.phone)
                cy.get('[data-cy="new-order-loyalty-loading"]').should('not.exist')
                cy.get('[data-cy="new-order-loyalty-reward"]').should('not.exist')
                cy.get('[data-cy="new-order-loyalty-error"]').should('not.exist')
            })
        })
    })

    describe('Detalle del pedido', () => {
        it('avisa que el cliente ya tenía un premio y lo aplica al pedido pendiente', () => {
            customerWithStamps(seed.a, 8, 'Ana Antes').then((customer) => {
                pendingOrder(customer).then((order) => {
                    visitOrders()
                    openDetail(order)
                    cy.get('[data-cy="order-customer-reward"]')
                        .should('contain', 'Ana tiene un premio disponible')
                        .and('contain', '20% de descuento')
                        .and('contain', 'Ya lo tenía de antes de este pedido.')
                        .and('contain', 'Puedes aplicarlo a este pedido.')

                    cy.intercept('POST', '**/loyalty/rewards/*/redeem').as('redeem')
                    cy.get('[data-cy="order-customer-reward-apply"]').click()
                    // Pide confirmación antes de cambiar el total.
                    cy.get('[data-cy="order-customer-reward-confirm"]')
                        .should('be.visible')
                        .closest('[role="group"]')
                        .should('contain', 'el total se recalcula')
                    cy.get('@redeem.all').should('have.length', 0)
                    cy.get('[data-cy="order-customer-reward-confirm"]').click()

                    cy.wait('@redeem').then(({ request, response }) => {
                        expect(request.body).to.deep.equal({ orderId: order.id })
                        expect(response?.statusCode).to.be.oneOf([200, 201])
                        expect(response?.body.order).to.include({ loyaltyDiscountAmount: 20 })
                        expect(response?.body.order.total).to.eq(80)
                    })
                    toast().should('contain', `Premio aplicado al pedido #${order.orderNumber}`)
                    // El bloque se retira y el resumen del pedido muestra el descuento.
                    cy.get('[data-cy="order-customer-reward"]').should('not.exist')
                    cy.get('[role="dialog"]')
                        .find('[data-cy="order-loyalty-discount"]')
                        .should('contain', '20% de descuento')
                    owner('GET', `/businesses/orders/${order.id}`).then((response) => {
                        expect(response.body.order.loyaltyDiscountAmount).to.eq(20)
                        expect(response.body.order.total).to.eq(80)
                    })
                    cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
                })
            })
        })

        it('si el premio se ganó con este pedido, lo dice y también permite aplicarlo en preparación', () => {
            customerWithStamps(seed.a, 7, 'Bea Ahora').then((customer) => {
                pendingOrder(customer).then((order) => {
                    setStatus(order.id, 'PREPARING').its('status').should('eq', 200)
                    // El 8.º sello llega después del pedido: el premio nace con este pedido.
                    walkInStamp(customer.id).its('status').should('eq', 201)
                    visitOrders()
                    openDetail(order)
                    cy.get('[data-cy="order-customer-reward"]')
                        .should('contain', 'Bea tiene un premio disponible')
                        .and('contain', 'Lo ganó con este pedido.')
                    cy.get('[data-cy="order-customer-reward-apply"]').should('be.visible')
                })
            })
        })

        it('en un pedido ya finalizado solo informa que queda para el próximo pedido', () => {
            customerWithStamps(seed.a, 8, 'Cris Listo').then((customer) => {
                finishedOrder(seed.a, customer)
                    .then(orderRef)
                    .then((order) => {
                        visitOrders()
                        openDetail(order)
                        cy.get('[data-cy="order-customer-reward"]')
                            .should('contain', 'Cris tiene un premio disponible')
                            .and('contain', 'Queda disponible para su próximo pedido.')
                        cy.get('[data-cy="order-customer-reward-apply"]').should('not.exist')
                    })
            })
        })

        it('muestra un aviso mientras revisa y no deja nada si el cliente no tiene premio', () => {
            createCustomer(seed.a, 'Dino Sinpremio').then((customer) => {
                pendingOrder(customer).then((order) => {
                    visitOrders()
                    cy.intercept('GET', `**/businesses/loyalty/cards/${customer.id}`, (request) => {
                        request.on('response', (response) => {
                            response.setDelay(1500)
                        })
                    }).as('card')
                    openDetail(order)
                    cy.get('[data-cy="order-customer-reward-loading"]')
                        .should('be.visible')
                        .and('contain', 'Revisando si el cliente tiene premio…')
                    cy.wait('@card')
                    cy.get('[data-cy="order-customer-reward-loading"]').should('not.exist')
                    cy.get('[data-cy="order-customer-reward"]').should('not.exist')
                })
            })
        })

        it('si el servidor rechaza el premio avisa y el bloque sigue disponible', () => {
            customerWithStamps(seed.a, 8, 'Eva Rechazo').then((customer) => {
                pendingOrder(customer).then((order) => {
                    visitOrders()
                    openDetail(order)
                    cy.intercept('POST', '**/loyalty/rewards/*/redeem', {
                        statusCode: 409,
                        body: {
                            error: {
                                code: 'LOYALTY_ORDER_ALREADY_HAS_REWARD',
                                message: 'Este pedido ya tiene un descuento.',
                            },
                        },
                    }).as('redeem')
                    cy.get('[data-cy="order-customer-reward-apply"]').click()
                    cy.get('[data-cy="order-customer-reward-confirm"]').click()
                    cy.wait('@redeem')
                    toast()
                        .should('contain', 'No se pudo aplicar el premio')
                        .and('contain', 'Este pedido ya tiene un descuento.')
                    cy.get('[data-cy="order-customer-reward"]').should('be.visible')
                    // Nada cambió en el servidor.
                    cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'AVAILABLE')
                })
            })
        })

        it('con el programa pausado el detalle no muestra el premio', () => {
            customerWithStamps(seed.a, 8, 'Fer Pausa').then((customer) => {
                pendingOrder(customer).then((order) => {
                    saveProgram({ enabled: false })
                    visitOrders()
                    openDetail(order)
                    cy.get('[data-cy="order-customer-reward"]').should('not.exist')
                    cy.get('[data-cy="order-customer-reward-loading"]').should('not.exist')
                })
            })
        })
    })
})
