import { assertPageFitsViewport, assertTouchTargets } from '../../support/responsive'
import {
    acceptedOrder,
    claimOffer,
    courierAction,
    createDeliveryOrder,
    createOffer,
    CUSTOMER,
    loginOwner,
    newCourier,
    offeredOrder,
    pickedUpOrder,
    setOrderStatus,
} from './deliveryApi'
import { type DeliverySeed, loginAsDeliveryOwner, seedDelivery } from './deliverySupport'

// Comanda (Pedidos) con pedidos a domicilio, contra el backend local real.
// Escenario del seed: 2 × $100 de comida, envío $50. Efectivo: el repartidor paga $200.

let seed: DeliverySeed

type Order = { id: string; orderNumber: number }

function orderCard(order: Order) {
    // La lista va de la más nueva a la más vieja: el pedido de la prueba está arriba.
    return cy.contains('article', `#${String(order.orderNumber).padStart(3, '0')}`)
}

function visitOrders(options: { share?: 'stub' | 'missing'; now?: number } = {}) {
    loginAsDeliveryOwner(seed)
    if (options.now) cy.clock(options.now, ['Date'])
    cy.visit('/dashboard/orders', {
        onBeforeLoad(win) {
            if (options.share === 'stub') {
                Object.defineProperty(win.navigator, 'share', {
                    configurable: true,
                    value: cy.stub().as('share').resolves(),
                })
            }
            if (options.share === 'missing') {
                Object.defineProperty(win.navigator, 'share', {
                    configurable: true,
                    value: undefined,
                })
                cy.stub(win, 'open').as('windowOpen')
            }
        },
    })
}

/** Pedido a domicilio aceptado (en preparación) y sin repartidor. */
function preparingOrder(paymentMethod: 'CASH' | 'TRANSFER' = 'CASH') {
    loginOwner(seed)
    return createDeliveryOrder(seed, paymentMethod).then((order: Order) =>
        setOrderStatus(order.id, 'PREPARING').then(() => order),
    )
}

describe('Entregas · comanda', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    describe('tarjeta del pedido', () => {
        it('muestra "A domicilio", la dirección con colonia y el envío', () => {
            preparingOrder().then((order) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="order-fulfillment"]').should('contain', 'A domicilio')
                    cy.get('[data-cy="order-delivery-address"]').should(
                        'contain',
                        `${CUSTOMER.address}, Col. ${CUSTOMER.neighborhood}`,
                    )
                    cy.get('[data-cy="order-delivery-fee"]').should('contain', '+ $50.00 envío')
                })
            })
        })

        it('un pedido pendiente pide aceptarlo antes de buscar repartidor', () => {
            loginOwner(seed)
            createDeliveryOrder(seed).then((order: Order) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-status"]').should(
                        'contain',
                        'Acepta el pedido para buscar repartidor',
                    )
                    cy.get('[data-cy="delivery-find-courier"]').should('not.exist')
                })
            })
        })
    })

    describe('buscar repartidor', () => {
        it('comparte el link con el menú del teléfono y sin datos del cliente', () => {
            preparingOrder().then((order) => {
                visitOrders({ share: 'stub' })
                orderCard(order).find('[data-cy="delivery-find-courier"]').click()
                cy.get('@share').should('have.been.calledOnce')
                cy.get('@share').then((share) => {
                    const { text } = (share as unknown as sinon.SinonStub).firstCall.args[0]
                    expect(text).to.match(
                        /^Pedido a domicilio de E2E Restaurante Envíos\. Ganas \$50\.00\. Tómalo aquí: http:\/\/localhost:3000\/e\/[A-Za-z0-9_-]+$/,
                    )
                    for (const secret of [
                        CUSTOMER.name,
                        CUSTOMER.phone,
                        CUSTOMER.address,
                        CUSTOMER.reference,
                    ]) {
                        expect(text).not.to.contain(secret)
                    }
                })
                orderCard(order)
                    .find('[data-cy="delivery-status"]')
                    .should('contain', 'Buscando repartidor')
            })
        })

        it('sin menú para compartir abre WhatsApp con el mensaje', () => {
            preparingOrder().then((order) => {
                visitOrders({ share: 'missing' })
                orderCard(order).find('[data-cy="delivery-find-courier"]').click()
                cy.get('@windowOpen').should('have.been.calledOnce')
                cy.get('@windowOpen').then((open) => {
                    const url = String((open as unknown as sinon.SinonStub).firstCall.args[0])
                    expect(url).to.match(/^https:\/\/wa\.me\/\?text=/)
                    expect(decodeURIComponent(url)).to.contain('Ganas $50.00')
                })
            })
        })

        it('con la oferta publicada, "Compartir" reutiliza el mismo link', () => {
            preparingOrder().then((order) => {
                visitOrders({ share: 'stub' })
                orderCard(order).find('[data-cy="delivery-find-courier"]').click()
                orderCard(order).find('[data-cy="delivery-share"]').click()
                cy.get('@share').should('have.been.calledTwice')
                cy.get('@share').then((share) => {
                    const stub = share as unknown as sinon.SinonStub
                    expect(stub.secondCall.args[0].text).to.eq(stub.firstCall.args[0].text)
                })
            })
        })

        it('por transferencia primero pide marcarla como recibida', () => {
            preparingOrder('TRANSFER').then((order) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-find-courier"]').should('not.exist')
                    cy.get('[data-cy="delivery-confirm-transfer"]')
                        .should('contain', 'Marcar transferencia recibida')
                        .click()
                    cy.get('[data-cy="delivery-find-courier"]').should('be.visible')
                })
            })
        })
    })

    describe('oferta sin tomar', () => {
        it('recién publicada no muestra aviso', () => {
            offeredOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-status"]').should('contain', 'Buscando repartidor')
                    cy.get('[data-cy="delivery-untaken-warning"]').should('not.exist')
                })
            })
        })

        it('después de 5 minutos muestra un aviso discreto', () => {
            offeredOrder(seed).then(({ order }) => {
                visitOrders({ now: Date.now() + 6 * 60_000 })
                orderCard(order)
                    .find('[data-cy="delivery-untaken-warning"]')
                    .should('contain', 'Nadie la ha tomado en más de 5 minutos')
            })
        })

        it('tras recargar ofrece "Compartir de nuevo" (link nuevo)', () => {
            offeredOrder(seed).then(({ order }) => {
                visitOrders({ share: 'stub' })
                orderCard(order).find('[data-cy="delivery-share-again"]').click()
                cy.get('@share').should('have.been.calledOnce')
            })
        })
    })

    describe('con repartidor', () => {
        it('muestra al repartidor y cuánto paga al recoger', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-courier"]')
                        .should('contain', 'Tomó la entrega')
                        .and('contain', 'Repartidor')
                        .find('a[href^="tel:+52"]')
                        .should('exist')
                    cy.get('[data-cy="delivery-handoff"]').should(
                        'contain',
                        'Entregado al repartidor (recibí $200.00)',
                    )
                })
            })
        })

        it('se actualiza en vivo cuando un repartidor la toma', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                visitOrders()
                orderCard(order)
                    .find('[data-cy="delivery-status"]')
                    .should('contain', 'Buscando repartidor')
                const courier = newCourier()
                claimOffer(offerToken, courier).its('status').should('eq', 201)
                orderCard(order)
                    .find('[data-cy="delivery-courier"]')
                    .should('contain', courier.name)
            })
        })

        it('"Entregado al repartidor" pide confirmación y pasa el pedido a "En camino"', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-handoff"]').click()
                    cy.contains('¿Ya recibiste $200.00 del repartidor').should('be.visible')
                    cy.get('[data-cy="delivery-handoff-confirm"]').click()
                    cy.contains('En camino').should('be.visible')
                    cy.get('[data-cy="delivery-courier"]').should('contain', 'En camino con')
                })
            })
        })

        it('"No" en la confirmación no cambia nada', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-handoff"]').click()
                    cy.contains('button', 'No').click()
                    cy.get('[data-cy="delivery-handoff"]').should('be.visible')
                    cy.get('[data-cy="delivery-panel"]').should(
                        'have.attr',
                        'data-dispatch-status',
                        'ACCEPTED',
                    )
                })
            })
        })

        it('"Liberar" pide confirmación y vuelve a publicar la oferta', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-release"]').click()
                    cy.get('[data-cy="delivery-release-confirm"]').click()
                    cy.get('[data-cy="delivery-status"]').should('contain', 'Buscando repartidor')
                    cy.get('[data-cy="delivery-courier"]').should('not.exist')
                    cy.get('[data-cy="delivery-share"]').should('be.visible')
                })
            })
        })

        it('cancelar con repartidor asignado pide confirmación', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).click()
                    cy.get('[data-cy="order-cancel-confirm"]').should(
                        'contain',
                        'ya tomó esta entrega',
                    )
                    cy.get('[data-cy="order-cancel-confirm-yes"]').click()
                    cy.contains('Cancelado').should('be.visible')
                })
            })
        })
    })

    describe('después de recoger', () => {
        it('en camino no se puede cancelar', () => {
            pickedUpOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).within(() => {
                    cy.contains('En camino').should('be.visible')
                    cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).should(
                        'not.exist',
                    )
                })
            })
        })

        it('en camino ofrece "Avisar al cliente" por WhatsApp con el mensaje listo', () => {
            pickedUpOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order)
                    .find('[data-cy="delivery-notify-customer"]')
                    .should('contain', 'Avisar al cliente')
                    .and('have.attr', 'target', '_blank')
                    .invoke('attr', 'href')
                    .then((href) => {
                        const [base, query] = String(href).split('?text=')
                        expect(base).to.eq(`https://wa.me/52${CUSTOMER.phone}`)
                        const message = decodeURIComponent(query ?? '')
                        expect(message).to.match(
                            /^Hola Cliente API, tu pedido #\d{3,} de E2E Restaurante Envíos ya va en camino\. Te lo lleva Repartidor \d+\. Ten listos \$250\.00 para pagarle al recibirlo\.$/,
                        )
                    })
            })
        })

        it('antes de recoger no ofrece "Avisar al cliente"', () => {
            acceptedOrder(seed).then(({ order }) => {
                visitOrders()
                orderCard(order).find('[data-cy="delivery-handoff"]').should('be.visible')
                orderCard(order).find('[data-cy="delivery-notify-customer"]').should('not.exist')
            })
        })

        it('entregado por el repartidor se ve como "Entregado"', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                courierAction(courierToken, 'delivered').its('status').should('eq', 204)
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-status"]').should('contain', 'Entregado por')
                    cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).should(
                        'not.exist',
                    )
                })
                cy.contains('button', 'Entregados').should('be.visible')
            })
        })

        it('si no se pudo entregar muestra el motivo y permite cancelar', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                courierAction(courierToken, 'failed', { reason: 'WRONG_ADDRESS' })
                    .its('status')
                    .should('eq', 204)
                visitOrders()
                orderCard(order).within(() => {
                    cy.get('[data-cy="delivery-status"]').should(
                        'contain',
                        'No se pudo entregar · Dirección incorrecta',
                    )
                    cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).click()
                    cy.contains('Cancelado').should('be.visible')
                })
            })
        })
    })

    describe('detalle y edición', () => {
        it('el detalle muestra la dirección, el total del cliente y las acciones', () => {
            preparingOrder().then((order) => {
                visitOrders()
                orderCard(order).find('button').first().click()
                cy.get('[role="dialog"]').within(() => {
                    cy.get('[data-cy="order-detail-delivery"]')
                        .should('contain', `${CUSTOMER.address}, Col. ${CUSTOMER.neighborhood}`)
                        .and('contain', `Referencia: ${CUSTOMER.reference}`)
                        .and('contain', 'El cliente paga $250.00')
                    cy.get('[data-cy="delivery-find-courier"]').should('be.visible')
                })
            })
        })

        it('al editar un pedido a domicilio no se puede cambiar la modalidad', () => {
            preparingOrder().then((order) => {
                visitOrders()
                orderCard(order).find('button').first().click()
                cy.contains('button', 'Editar orden').click()
                cy.get('[data-cy="edit-order-delivery-locked"]').should(
                    'contain',
                    'no se puede cambiar',
                )
                cy.contains('button', 'Comer aquí').should('not.exist')
            })
        })
    })

    it('en móvil (375×812) el panel cabe y sus botones son táctiles', () => {
        cy.viewport(375, 812)
        acceptedOrder(seed).then(({ order }) => {
            visitOrders()
            orderCard(order).scrollIntoView()
            assertPageFitsViewport()
            assertTouchTargets('[data-cy="delivery-handoff"]')
            assertTouchTargets('[data-cy="delivery-release"]')
        })
    })

    it('una oferta creada desde otra sesión aparece sin recargar', () => {
        preparingOrder().then((order) => {
            visitOrders()
            orderCard(order).find('[data-cy="delivery-find-courier"]').should('be.visible')
            createOffer(order.id).its('status').should('eq', 201)
            orderCard(order)
                .find('[data-cy="delivery-status"]')
                .should('contain', 'Buscando repartidor')
        })
    })
})
