import { assertPageFitsViewport, assertTouchTargets } from '../../support/responsive'
import {
    acceptedOrder,
    claimOffer,
    CUSTOMER,
    getOrder,
    loginOwner,
    newCourier,
    offeredOrder,
    ownerPost,
    pickedUpOrder,
    setOrderStatus,
} from './deliveryApi'
import { type DeliverySeed, seedDelivery, stubMapServices } from './deliverySupport'

// Páginas del repartidor (/e/:token y /entrega/:token), contra el backend local real.
// Escenario del seed: 2 × $100 de comida, envío $50, efectivo → paga $200, cobra $250.

let seed: DeliverySeed

const RESTAURANT = 'E2E Restaurante Envíos'
const COURIER = { name: 'Luis Repartidor', phone: '6691234567' }

function visitOffer(token: string, options: { identity?: typeof COURIER } = {}) {
    stubMapServices()
    cy.visit(`/e/${token}`, {
        onBeforeLoad(win) {
            win.localStorage.clear()
            if (options.identity) {
                win.localStorage.setItem('pedilo:courier', JSON.stringify(options.identity))
            }
        },
    })
}

function visitDelivery(token: string, onBeforeLoad?: (win: Cypress.AUTWindow) => void) {
    stubMapServices()
    cy.visit(`/entrega/${token}`, { onBeforeLoad })
}

function expectNoCustomerData() {
    cy.get('main').then(($main) => {
        const text = $main.text()
        for (const secret of [
            CUSTOMER.name,
            CUSTOMER.phone,
            CUSTOMER.address,
            CUSTOMER.reference,
        ]) {
            expect(text).not.to.contain(secret)
        }
    })
}

describe('Entregas · páginas del repartidor', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    describe('oferta (/e/:token)', () => {
        it('muestra un skeleton mientras carga', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                cy.intercept('GET', `**/public/deliveries/offer/${offerToken}`, (request) => {
                    request.on('response', (response) => {
                        response.setDelay(800)
                    })
                })
                visitOffer(offerToken)
                cy.get('[data-cy="courier-skeleton"]').should('be.visible')
                cy.get('[data-cy="courier-offer"]').should('be.visible')
                cy.get('[data-cy="courier-skeleton"]').should('not.exist')
            })
        })

        it('muestra restaurante, zona, ganancia, cuánto adelanta y artículos', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer-restaurant"]').should('have.text', RESTAURANT)
                cy.get('[data-cy="courier-offer-zone"]').should(
                    'contain',
                    'Col. Centro · 3.4 km al norte del restaurante',
                )
                cy.get('[data-cy="courier-offer-earnings"]').should('have.text', '$50.00')
                cy.get('[data-cy="courier-offer-advance"]').should('have.text', '$200.00')
                cy.get('[data-cy="courier-offer-items"]').should('have.text', '2 artículos')
            })
        })

        it('antes de tomarla no muestra datos del cliente', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer"]').should('be.visible')
                expectNoCustomerData()
            })
        })

        it('la primera vez pide nombre y teléfono y valida el teléfono', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                cy.intercept('POST', `**/public/deliveries/offer/${offerToken}/claim`).as('claim')
                visitOffer(offerToken)
                cy.get('[data-cy="courier-identity-form"]').should('be.visible')
                cy.get('[data-cy="courier-name"]').type(COURIER.name)
                cy.get('[data-cy="courier-phone"]').type('66912')
                cy.get('[data-cy="courier-claim"]').click()
                cy.get('[data-cy="courier-phone-error"]').should('contain', 'Debe tener 10 dígitos')
                cy.get('@claim.all').should('have.length', 0)
                cy.location('pathname').should('eq', `/e/${offerToken}`)
            })
        })

        it('al tomarla abre el link personal y guarda los datos en el teléfono', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                visitOffer(offerToken)
                cy.get('[data-cy="courier-name"]').type(COURIER.name)
                cy.get('[data-cy="courier-phone"]').type(COURIER.phone)
                cy.get('[data-cy="courier-claim"]').click()
                cy.location('pathname').should('match', /^\/entrega\/[A-Za-z0-9_-]+$/)
                cy.get('[data-cy="courier-delivery-title"]').should('have.text', 'Recoge el pedido')
                cy.window().then((win) => {
                    expect(
                        JSON.parse(win.localStorage.getItem('pedilo:courier') ?? '{}'),
                    ).to.deep.eq(COURIER)
                })
                getOrder(order.id).then((body) => {
                    expect(body.dispatch.status).to.eq('ACCEPTED')
                    expect(body.dispatch.courier).to.deep.include(COURIER)
                })
            })
        })

        it('con datos guardados la toma sin volver a pedirlos', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken, { identity: COURIER })
                cy.get('[data-cy="courier-identity-form"]').should('not.exist')
                cy.get('[data-cy="courier-identity"]').should('contain', COURIER.name)
                cy.get('[data-cy="courier-identity"]').should('contain', '66 9123 4567')
                cy.get('[data-cy="courier-claim"]').click()
                cy.location('pathname').should('match', /^\/entrega\//)
            })
        })

        it('"Cambiar" permite corregir los datos guardados', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken, { identity: COURIER })
                cy.get('[data-cy="courier-identity-change"]').click()
                cy.get('[data-cy="courier-name"]').should('have.value', COURIER.name)
                cy.get('[data-cy="courier-phone"]').should('have.value', COURIER.phone)
            })
        })

        it('si otro repartidor ya la tomó lo dice', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                claimOffer(offerToken, newCourier()).its('status').should('eq', 201)
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer-taken"]').should(
                    'contain',
                    'Esta entrega ya fue tomada',
                )
                cy.get('[data-cy="courier-claim"]').should('not.exist')
            })
        })

        it('si otro la toma mientras la ve, "Tomar" muestra que ya fue tomada', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken, { identity: COURIER })
                cy.get('[data-cy="courier-offer"]').should('be.visible')
                claimOffer(offerToken, newCourier()).its('status').should('eq', 201)
                cy.get('[data-cy="courier-claim"]').click()
                cy.get('[data-cy="courier-offer-taken"]').should('be.visible')
                cy.location('pathname').should('eq', `/e/${offerToken}`)
            })
        })

        it('quien la tomó en este teléfono puede volver a su entrega', () => {
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken, { identity: COURIER })
                cy.get('[data-cy="courier-claim"]').click()
                cy.location('pathname').should('match', /^\/entrega\//)
                cy.location('pathname').then((deliveryPath) => {
                    stubMapServices()
                    cy.visit(`/e/${offerToken}`)
                    cy.get('[data-cy="courier-offer-mine"]').should(
                        'contain',
                        'Ya tomaste esta entrega',
                    )
                    cy.get('[data-cy="courier-open-mine"]').should(
                        'have.attr',
                        'href',
                        deliveryPath,
                    )
                })
            })
        })

        it('si el restaurante canceló el pedido, la oferta ya no está disponible', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                setOrderStatus(order.id, 'CANCELLED').its('status').should('eq', 200)
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer-expired"]').should(
                    'contain',
                    'Esta entrega ya no está disponible',
                )
            })
        })

        it('un link reemplazado ("compartir de nuevo") ya no funciona', () => {
            offeredOrder(seed).then(({ order, offerToken }) => {
                ownerPost(`/businesses/orders/${order.id}/delivery`).its('status').should('eq', 201)
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer-invalid"]').should(
                    'contain',
                    'Este link ya no funciona',
                )
            })
        })

        it('un link inventado muestra que no funciona', () => {
            visitOffer('token-que-no-existe-1234567890')
            cy.get('[data-cy="courier-offer-invalid"]').should('be.visible')
        })

        it('si falla la red muestra un error discreto con "Reintentar"', () => {
            cy.intercept('GET', '**/public/deliveries/offer/*', { statusCode: 500, body: {} })
            visitOffer('cualquier-token-1234567890')
            cy.get('[data-cy="courier-offer-error"]', { timeout: 15000 })
                .should('contain', 'No pudimos cargar la entrega')
                .and('contain', 'Reintentar')
        })

        it('en móvil (375×812) cabe y los botones son táctiles', () => {
            cy.viewport(375, 812)
            offeredOrder(seed).then(({ offerToken }) => {
                visitOffer(offerToken)
                cy.get('[data-cy="courier-offer"]').should('be.visible')
                assertPageFitsViewport()
                assertTouchTargets('[data-cy="courier-claim"], input', 44)
            })
        })
    })

    describe('entrega tomada (/entrega/:token)', () => {
        it('antes de recogerla indica a dónde ir y cuánto pagar, sin "Entregado"', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivery-title"]').should('have.text', 'Recoge el pedido')
                cy.get('[data-cy="courier-pickup-note"]').should(
                    'contain',
                    'Al recoger, paga $200.00 al restaurante',
                )
                cy.get('[data-cy="courier-delivered"]').should('not.exist')
                cy.get('[data-cy="courier-failed"]').should('not.exist')
            })
        })

        it('muestra cliente, dirección con colonia, referencia y pedido', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-customer-name"]').should('have.text', CUSTOMER.name)
                cy.get('[data-cy="courier-address"]').should(
                    'have.text',
                    `${CUSTOMER.address}, Col. ${CUSTOMER.neighborhood}`,
                )
                cy.get('[data-cy="courier-reference"]').should('contain', CUSTOMER.reference)
                cy.get('[data-cy="courier-items"]')
                    .should('contain', '2×')
                    .and('contain', 'E2E Envío Tacos')
            })
        })

        it('el bloque de dinero dice cuánto paga, cobra y gana', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-money-advances"]').should('have.text', '$200.00')
                cy.get('[data-cy="courier-money-collects"]').should('have.text', '$250.00')
                cy.get('[data-cy="courier-money-earnings"]').should('have.text', '$50.00')
            })
        })

        it('"Llamar al cliente" y "Abrir en Maps" llevan al teléfono y a la ruta', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-call-customer"]').should(
                    'have.attr',
                    'href',
                    `tel:+52${CUSTOMER.phone}`,
                )
                cy.get('[data-cy="courier-open-maps"]')
                    .should('have.attr', 'href')
                    .and(
                        'match',
                        /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d+\.\d+,-?\d+\.\d+$/,
                    )
            })
        })

        it('muestra el mapa de OpenStreetMap con su atribución', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-map"] .leaflet-container').should('exist')
                cy.get('[data-cy="courier-map"] .leaflet-marker-icon').should('have.length', 1)
                cy.get('[data-cy="courier-map"]').should('contain', 'OpenStreetMap')
            })
        })

        it('el link personal sobrevive a una recarga', () => {
            acceptedOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivery-title"]').should('be.visible')
                cy.reload()
                cy.get('[data-cy="courier-delivery-title"]').should('have.text', 'Recoge el pedido')
            })
        })

        it('cuando el restaurante se la entrega, la página cambia sola', () => {
            acceptedOrder(seed).then(({ order, courierToken }) => {
                visitDelivery(courierToken, () => undefined)
                cy.clock(Date.now(), ['setInterval'])
                cy.get('[data-cy="courier-delivery-title"]').should('have.text', 'Recoge el pedido')
                loginOwner(seed)
                ownerPost(`/businesses/orders/${order.id}/delivery/handoff`)
                    .its('status')
                    .should('eq', 200)
                cy.tick(20_000)
                cy.get('[data-cy="courier-delivery-title"]').should(
                    'have.text',
                    'Lleva el pedido al cliente',
                )
                cy.get('[data-cy="courier-delivered"]').should('be.visible')
            })
        })

        it('"Entregado" pide confirmación con lo que cobra', () => {
            pickedUpOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivered"]').click()
                cy.contains('¿Entregaste el pedido y cobraste $250.00?').should('be.visible')
                cy.contains('button', /^No$/).click()
                cy.get('[data-cy="courier-delivered"]').should('be.visible')
            })
        })

        it('al confirmar "Entregado" cierra la entrega y el pedido', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivered"]').click()
                cy.get('[data-cy="courier-confirm-delivered"]').click()
                cy.get('[data-cy="courier-delivered-state"]').should(
                    'contain',
                    'Entrega completada',
                )
                cy.get('[data-cy="courier-call-customer"]').should('not.exist')
                loginOwner(seed)
                getOrder(order.id).then((body) => {
                    expect(body.status).to.eq('DELIVERED')
                    expect(body.dispatch.status).to.eq('DELIVERED')
                })
            })
        })

        it('"No se pudo entregar" pide el motivo antes de confirmar', () => {
            pickedUpOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-failed"]').click()
                cy.get('[data-cy="courier-confirm-failed"]').should('be.disabled')
                cy.get('[data-cy="courier-reason-WRONG_ADDRESS"]').click()
                cy.get('[data-cy="courier-confirm-failed"]').should('be.enabled')
                cy.contains('button', 'Volver').click()
                cy.get('[data-cy="courier-confirm-failed"]').should('not.exist')
            })
        })

        it('al confirmar la falla queda registrado el motivo', () => {
            pickedUpOrder(seed).then(({ order, courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-failed"]').click()
                cy.get('[data-cy="courier-reason-CUSTOMER_UNREACHABLE"]').click()
                cy.get('[data-cy="courier-confirm-failed"]').click()
                cy.get('[data-cy="courier-failed-state"]').should('contain', 'No se pudo entregar')
                cy.get('[data-cy="courier-failed-reason"]').should(
                    'contain',
                    'El cliente no contesta',
                )
                loginOwner(seed)
                getOrder(order.id).then((body) => {
                    expect(body.dispatch.status).to.eq('FAILED')
                    expect(body.dispatch.failureReason).to.eq('CUSTOMER_UNREACHABLE')
                })
            })
        })

        it('si el restaurante la liberó, el link ya no está activo', () => {
            acceptedOrder(seed).then(({ order, courierToken }) => {
                ownerPost(`/businesses/orders/${order.id}/delivery/release`)
                    .its('status')
                    .should('eq', 200)
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivery-invalid"]').should(
                    'contain',
                    'Este link ya no está activo',
                )
                expectNoCustomerData()
            })
        })

        it('si el restaurante canceló el pedido lo avisa sin datos del cliente', () => {
            acceptedOrder(seed).then(({ order, courierToken }) => {
                setOrderStatus(order.id, 'CANCELLED').its('status').should('eq', 200)
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-cancelled-state"]').should(
                    'contain',
                    'El restaurante canceló esta entrega',
                )
                cy.get('[data-cy="courier-call-customer"]').should('not.exist')
            })
        })

        it('un link expirado lo dice', () => {
            cy.intercept('GET', '**/public/deliveries/courier/*', {
                statusCode: 410,
                body: { success: false, error: { code: 'DELIVERY_LINK_EXPIRED', message: 'x' } },
            })
            visitDelivery('token-expirado-1234567890')
            cy.get('[data-cy="courier-delivery-expired"]').should('contain', 'Este link expiró')
        })

        it('en móvil (375×812) cabe y los botones son táctiles', () => {
            cy.viewport(375, 812)
            pickedUpOrder(seed).then(({ courierToken }) => {
                visitDelivery(courierToken)
                cy.get('[data-cy="courier-delivered"]').should('be.visible')
                assertPageFitsViewport()
                assertTouchTargets(
                    '[data-cy="courier-delivered"], [data-cy="courier-failed"], [data-cy="courier-open-maps"], [data-cy="courier-call-customer"]',
                    44,
                )
            })
        })
    })
})
