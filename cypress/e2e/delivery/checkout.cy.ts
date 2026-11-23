import { assertPageFitsViewport, assertTouchTargets } from '../../support/responsive'
import {
    backendApi,
    type Coordinates,
    DELIVERY_SEED_PRODUCT,
    DELIVERY_SEED_SETTINGS,
    type DeliverySeed,
    pointAtRoadKm,
    seedDelivery,
    stubMapServices,
} from './deliverySupport'

// Checkout "A domicilio" del menú público contra el backend local real.
// Escenario del seed: producto de $100; envío hasta 2 km → $30, hasta 5 km → $50; radio 5 km.

let seed: DeliverySeed

type VisitOptions = { geolocation?: Coordinates | 'denied' }

function visitMenuWithCart({ geolocation }: VisitOptions = {}) {
    stubMapServices()
    cy.intercept('POST', '**/delivery/quote').as('quote')
    cy.intercept('POST', `**/businesses/${seed.businessId}/orders`).as('createOrder')
    cy.visit(`/${seed.slug}`, {
        onBeforeLoad(win) {
            // Sin ventana emergente: la confirmación muestra el enlace manual de WhatsApp.
            cy.stub(win, 'open').as('openWhatsApp').returns(null)
            if (geolocation) {
                cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
                    (success: PositionCallback, failure?: PositionErrorCallback) => {
                        if (geolocation === 'denied') {
                            failure?.({
                                code: 1,
                                message: 'denied',
                                PERMISSION_DENIED: 1,
                                POSITION_UNAVAILABLE: 2,
                                TIMEOUT: 3,
                            } as GeolocationPositionError)
                        } else {
                            success({
                                coords: { ...geolocation, accuracy: 5 },
                                timestamp: Date.now(),
                            } as GeolocationPosition)
                        }
                    },
                )
            }
        },
    })
    cy.get(`button[aria-label="Agregar al carrito: ${DELIVERY_SEED_PRODUCT.name}"]`).click()
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type('Cliente Envío')
    cy.get('#customer-phone').type('6691112233')
}

function chooseDeliveryWithAddress() {
    cy.get('[data-cy="fulfillment-delivery"]').click()
    cy.get('[data-cy="delivery-address"]').type('Av. del Mar 100')
    cy.get('[data-cy="delivery-neighborhood"]').type('Centro')
    cy.get('[data-cy="delivery-reference"]').type('Portón azul')
}

function useMyLocation() {
    cy.get('[data-cy="delivery-use-my-location"]').click()
    cy.wait('@quote')
}

/** Cambia la configuración de envío en el backend como el dueño. El seed la restablece. */
function updateSeedSettings(overrides: Partial<typeof DELIVERY_SEED_SETTINGS>) {
    backendApi('').then((api) => {
        cy.request('POST', `${api}/auth/login`, {
            email: seed.email,
            password: 'Strong-pass-123',
        })
        cy.request('PUT', `${api}/businesses/delivery-settings`, {
            ...DELIVERY_SEED_SETTINGS,
            ...overrides,
        })
    })
}

function changeSeedTariff(tiers: { upToKm: number; fee: number }[]) {
    updateSeedSettings({ feeConfig: { type: 'DISTANCE_TIERS', tiers } })
}

describe('Envío a domicilio · checkout del cliente', () => {
    beforeEach(() => {
        seedDelivery().then((value) => {
            seed = value
        })
        cy.clearCookies()
    })

    it('ofrece "A domicilio" cuando el restaurante tiene envío activo', () => {
        visitMenuWithCart()
        cy.get('[data-cy="fulfillment-delivery"]')
            .should('be.visible')
            .and('contain', 'A domicilio')
    })

    describe('con el envío desactivado por el restaurante', () => {
        afterEach(() => {
            seedDelivery()
        })

        it('no ofrece "A domicilio"', () => {
            // Desactivarlo invalida la caché del menú público: el cambio se ve de inmediato.
            updateSeedSettings({ enabled: false })
            cy.clearCookies()
            visitMenuWithCart()
            cy.get('[data-cy="fulfillment-dine_in"]').should('be.visible')
            cy.get('[data-cy="fulfillment-delivery"]').should('not.exist')
        })
    })

    it('sin colonia no se puede confirmar', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        cy.get('[data-cy="fulfillment-delivery"]').click()
        cy.get('[data-cy="delivery-address"]').type('Av. del Mar 100')
        useMyLocation()
        cy.get('[data-cy="checkout-submit"]').should('be.disabled')
        cy.get('[data-cy="delivery-submit-hint"]').should('have.text', 'Escribe tu colonia.')
        cy.get('[data-cy="delivery-neighborhood"]').type('Centro')
        cy.get('[data-cy="checkout-submit"]').should('not.be.disabled')
    })

    it('sin pin no se puede confirmar', () => {
        visitMenuWithCart()
        chooseDeliveryWithAddress()
        cy.get('[data-cy="checkout-submit"]').should('be.disabled')
        cy.get('[data-cy="delivery-submit-hint"]').should('contain', 'Marca tu ubicación')
        cy.get('[data-cy="checkout-delivery-fee"]').should('contain', 'Marca tu ubicación')
    })

    it('sin dirección no se puede confirmar aunque haya pin', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 1) })
        cy.get('[data-cy="fulfillment-delivery"]').click()
        useMyLocation()
        cy.get('[data-cy="delivery-quote"]').should('be.visible')
        cy.get('[data-cy="checkout-submit"]').should('be.disabled')
        cy.get('[data-cy="delivery-submit-hint"]').should('contain', 'Escribe tu dirección')
    })

    it('"Usar mi ubicación" coloca el pin y muestra el envío calculado por el servidor', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('@quote')
            .its('response.body.quote')
            .should('deep.include', { distanceKm: 3.4, fee: 50 })
        cy.get('[data-cy="delivery-quote"]').should('contain', '3.4 km').and('contain', '$50.00')
        cy.get('[data-cy="delivery-pin-map"] .leaflet-marker-icon').should('exist')
    })

    it('tocar el mapa coloca el pin y cotiza el envío', () => {
        visitMenuWithCart()
        chooseDeliveryWithAddress()
        cy.get('[data-cy="delivery-pin-map"] .leaflet-container').click()
        cy.wait('@quote').its('response.statusCode').should('eq', 200)
        cy.get('[data-cy="delivery-pin-map"] .leaflet-marker-icon').should('exist')
        cy.get('[data-cy="delivery-quote-fee"]').should('have.text', '$30.00')
    })

    it('suma el envío al total del resumen y del botón', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="checkout-delivery-fee"]').should('contain', '$50.00')
        cy.get('[data-cy="checkout-total"]').should('contain', '$150.00')
        cy.get('[data-cy="checkout-submit"]').should('not.be.disabled').and('contain', '$150.00')
    })

    it('fuera del radio bloquea el pedido y lo explica', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 7) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="delivery-out-of-range"]')
            .should('contain', 'fuera del área de entrega')
            .and('contain', '7 km')
            .and('contain', 'hasta 5 km')
        cy.get('[data-cy="checkout-submit"]').should('be.disabled')
        cy.get('[data-cy="delivery-submit-hint"]').should('contain', 'fuera del área')
    })

    it('si no hay permiso de ubicación muestra un aviso discreto', () => {
        visitMenuWithCart({ geolocation: 'denied' })
        chooseDeliveryWithAddress()
        cy.get('[data-cy="delivery-use-my-location"]').click()
        cy.get('[data-cy="delivery-locate-error"]').should('contain', 'Toca el mapa')
        cy.get('[data-cy="checkout-submit"]').should('be.disabled')
    })

    it('por transferencia explica que el envío se paga en efectivo al repartidor', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="payment-method-transfer"]').check({ force: true })
        cy.get('[data-cy="delivery-transfer-note"]').should(
            'have.text',
            'Pagas la comida por transferencia y el envío ($50.00) en efectivo al repartidor',
        )
    })

    it('crea el pedido con el snapshot de entrega calculado por el servidor', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@createOrder').then(({ request, response }) => {
            expect(request.body.fulfillmentType).to.eq('DELIVERY')
            expect(request.body.expectedDeliveryFee).to.eq(50)
            expect(request.body.delivery).to.include({
                address: 'Av. del Mar 100',
                neighborhood: 'Centro',
                reference: 'Portón azul',
            })
            expect(request.body.delivery).not.to.have.property('distanceKm')
            expect(response?.statusCode).to.eq(201)
            const order = response?.body.order
            expect(order.fulfillmentType).to.eq('DELIVERY')
            expect(order.total).to.eq(100)
            expect(order.deliveryFee).to.eq(50)
            expect(order.delivery).to.include({
                address: 'Av. del Mar 100',
                neighborhood: 'Centro',
                distanceKm: 3.4,
            })
        })
        cy.get('[data-cy="confirmation-delivery-payment"]').should(
            'contain',
            'Pagas $150.00 en efectivo al repartidor',
        )
    })

    it('el WhatsApp al restaurante incluye dirección, ubicación y envío', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@createOrder')
        cy.get('[data-testid="manual-whatsapp-link"]')
            .invoke('attr', 'href')
            .then((href) => {
                const message = decodeURIComponent(String(href).split('?text=')[1] ?? '')
                expect(message).to.contain('Modalidad: A domicilio')
                expect(message).to.contain('Dirección: Av. del Mar 100')
                expect(message).to.contain('Colonia: Centro')
                expect(message).to.contain('Referencia: Portón azul')
                expect(message).to.contain('https://www.google.com/maps?q=')
                expect(message).to.contain('Envío a domicilio: $50.00')
                expect(message).to.contain('Total: $150.00')
            })
    })

    describe('si el envío cambia durante el checkout', () => {
        afterEach(() => {
            seedDelivery()
        })

        it('no crea el pedido y pide confirmar el nuevo total', () => {
            visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
            chooseDeliveryWithAddress()
            useMyLocation()
            cy.get('[data-cy="delivery-quote-fee"]').should('have.text', '$50.00')
            changeSeedTariff([
                { upToKm: 2, fee: 30 },
                { upToKm: 5, fee: 60 },
            ])
            cy.get('[data-cy="checkout-submit"]').click()
            cy.wait('@createOrder').then(({ response }) => {
                expect(response?.statusCode).to.eq(409)
                expect(response?.body.error.code).to.eq('DELIVERY_FEE_CHANGED')
                expect(response?.body.error.details).to.include({
                    expectedDeliveryFee: 50,
                    currentDeliveryFee: 60,
                })
            })
            cy.get('[data-cy="delivery-fee-change-warning"]')
                .should('contain', 'Ahora es $60.00')
                .and('contain', '$160.00')
            cy.get('[data-cy="checkout-submit"]').should('be.disabled')
            cy.get('[data-cy="confirmation-delivery-payment"]').should('not.exist')
        })

        it('al confirmar el nuevo total crea el pedido con el envío nuevo', () => {
            visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
            chooseDeliveryWithAddress()
            useMyLocation()
            changeSeedTariff([
                { upToKm: 2, fee: 30 },
                { upToKm: 5, fee: 60 },
            ])
            cy.get('[data-cy="checkout-submit"]').click()
            cy.wait('@createOrder')
            cy.get('[data-cy="delivery-fee-change-accept"]').click()
            cy.wait('@createOrder').then(({ request, response }) => {
                expect(request.body.expectedDeliveryFee).to.eq(60)
                expect(response?.statusCode).to.eq(201)
                expect(response?.body.order.deliveryFee).to.eq(60)
            })
            cy.get('[data-cy="confirmation-delivery-payment"]').should('contain', '$160.00')
        })
    })

    it('si el servidor rechaza la ubicación al confirmar muestra el motivo', () => {
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 3.4) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.intercept('POST', `**/businesses/${seed.businessId}/orders`, {
            statusCode: 422,
            body: {
                error: {
                    code: 'DELIVERY_OUT_OF_RANGE',
                    message: 'The address is outside the delivery area',
                    details: { distanceKm: 5.2, maxDeliveryKm: 5 },
                },
            },
        }).as('rejectedOrder')
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@rejectedOrder')
        cy.get('[data-testid="order-error"]').should('contain', 'fuera del área de entrega')
    })

    it('en móvil (375×812) los campos de domicilio caben y son táctiles', () => {
        cy.viewport(375, 812)
        visitMenuWithCart({ geolocation: pointAtRoadKm(seed.origin, 1) })
        chooseDeliveryWithAddress()
        useMyLocation()
        cy.get('[data-cy="delivery-checkout"]').scrollIntoView()
        assertPageFitsViewport()
        assertTouchTargets('[data-cy="delivery-use-my-location"]')
        cy.get('[data-cy="delivery-pin-map"]').then(($map) => {
            const rect = $map[0].getBoundingClientRect()
            expect(rect.left).to.be.at.least(0)
            expect(rect.right).to.be.at.most(375)
        })
    })
})
