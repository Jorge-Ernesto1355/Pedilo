// Experiencia del cliente final: menú, checkout, "Pedido realizado" y /tarjeta/:token. Fase 7.
import {
    asOwner,
    availableReward,
    cardToken,
    customerWithStamps,
    type LoyaltySeed,
    owner,
    PRODUCT_PRICE,
    saveProgram,
    seedLoyalty,
    type SeedCustomer,
    uniquePhone,
    walkInStamp,
} from './loyaltySupport'

let seed: LoyaltySeed

const PRODUCT_NAME = 'E2E Lealtad Tacos'
const tokenKey = (slug: string) => `pedilo:loyalty:card:${slug}`
const seenKey = (token: string) => `pedilo:loyalty:seen:${token}`

type VisitOptions = { token?: string | null; reducedMotion?: boolean }

function visitMenu(options: VisitOptions = {}) {
    cy.intercept('POST', `**/businesses/${seed.a.businessId}/orders`).as('createOrder')
    cy.intercept('POST', '**/loyalty/reward-quote').as('quote')
    cy.visit(`/${seed.a.slug}`, {
        onBeforeLoad(win) {
            win.localStorage.clear()
            if (options.token) win.localStorage.setItem(tokenKey(seed.a.slug), options.token)
            cy.stub(win, 'open').as('openWhatsApp').returns(null)
        },
    })
}

function openCheckout(customer: { name: string; phone: string }, quantity = 1) {
    for (let index = 0; index < quantity; index += 1) {
        cy.get(`button[aria-label="Agregar al carrito: ${PRODUCT_NAME}"]`).click()
    }
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type(customer.name)
    cy.get('#customer-phone').type(customer.phone)
}

function visitCard(token: string, options: { keepSeen?: boolean; reducedMotion?: boolean } = {}) {
    cy.intercept('GET', `**/public/loyalty/*`).as('card')
    cy.visit(`/tarjeta/${token}`, {
        onBeforeLoad(win) {
            if (!options.keepSeen) win.localStorage.removeItem(seenKey(token))
            if (options.reducedMotion) {
                const original = win.matchMedia.bind(win)
                cy.stub(win, 'matchMedia').callsFake((query: string) =>
                    query.includes('prefers-reduced-motion')
                        ? ({
                              matches: true,
                              media: query,
                              addEventListener() {},
                              removeEventListener() {},
                          } as unknown as MediaQueryList)
                        : original(query),
                )
            }
        },
    })
    cy.wait('@card')
}

/** Cliente con premio disponible y su llave de tarjeta. */
function customerWithReward(): Cypress.Chainable<{
    customer: SeedCustomer
    token: string
    rewardId: string
}> {
    return customerWithStamps(seed.a, 8, 'Rosa Premio').then((customer) =>
        cardToken(customer.id).then((token) =>
            availableReward(customer.id).then((reward) => ({
                customer,
                token,
                rewardId: reward.id,
            })),
        ),
    )
}

describe('Lealtad · cliente final', () => {
    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
    })

    describe('menú y checkout', () => {
        it('el menú muestra una banda discreta con la promoción', () => {
            visitMenu()
            cy.get('[data-cy="menu-loyalty-band"]')
                .should('contain', 'Junta 8 sellos y gana 20% de descuento')
                .find('[data-testid="loyalty-card"]')
                .should('have.attr', 'data-variant', 'compact')
            cy.get(`button[aria-label="Agregar al carrito: ${PRODUCT_NAME}"]`).should('be.visible')
        })

        it('sin programa activo no hay banda ni bloque en el checkout', () => {
            saveProgram({ enabled: false })
            visitMenu()
            cy.get(`button[aria-label="Agregar al carrito: ${PRODUCT_NAME}"]`).should('be.visible')
            cy.get('[data-cy="menu-loyalty-band"]').should('not.exist')
        })

        it('con token y premio disponible ofrece "Usar mi premio" y el servidor recalcula el total', () => {
            customerWithReward().then(({ customer, token, rewardId }) => {
                visitMenu({ token })
                openCheckout(customer, 2)
                cy.get('[data-cy="checkout-loyalty-toggle"]').should('not.be.checked')
                cy.get('[data-cy="checkout-total"]').should('contain', '$200.00')
                cy.get('[data-cy="checkout-loyalty"]').should(
                    'contain',
                    'Usar mi premio: 20% de descuento',
                )
                cy.get('[data-cy="checkout-loyalty-toggle"]').check()
                cy.get('[data-cy="checkout-loyalty-discount"]').should('contain', '−$40.00')
                cy.get('[data-cy="checkout-total"]').should('contain', '$160.00')
                cy.contains('button', 'Confirmar pedido').click()
                cy.wait('@createOrder').then(({ request, response }) => {
                    expect(request.body.loyalty).to.deep.eq({
                        cardToken: token,
                        rewardId,
                        expectedDiscount: 40,
                    })
                    expect(response?.body.order).to.include({
                        total: 160,
                        loyaltyDiscountAmount: 40,
                    })
                })
            })
        })

        it('sin token no ofrece el premio', () => {
            customerWithReward().then(({ customer }) => {
                visitMenu({ token: null })
                openCheckout(customer)
                cy.get('[data-cy="checkout-summary"]').should('be.visible')
                cy.get('[data-cy="checkout-loyalty-toggle"]').should('not.exist')
                cy.get('[data-cy="checkout-loyalty"]').should('not.exist')
            })
        })

        it('sin premio, una línea sutil dice cuántos sellos faltan', () => {
            customerWithStamps(seed.a, 6, 'Sara Seis').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitMenu({ token })
                    cy.get('[data-cy="menu-loyalty-band"]').should(
                        'contain',
                        'Llevas 6 de 8 sellos.',
                    )
                    openCheckout(customer)
                    cy.get('[data-cy="checkout-loyalty-progress"]').should(
                        'have.text',
                        'Te faltan 2 sellos para tu premio.',
                    )
                })
            })
        })

        it('con transferencia el monto a transferir ya incluye el descuento', () => {
            customerWithReward().then(({ customer, token }) => {
                visitMenu({ token })
                openCheckout(customer)
                cy.get('[data-cy="payment-method-transfer"]').check()
                cy.get('[data-cy="checkout-loyalty-toggle"]').check()
                cy.get('[data-cy="checkout-total"]').should('contain', '$80.00')
                cy.contains('button', 'Confirmar pedido').click()
                cy.wait('@createOrder').its('response.body.order.total').should('eq', 80)
                cy.get('[data-cy="open-transfer-card"]').click()
                cy.get('[data-cy="transfer-card-modal"]').should(
                    'contain',
                    'Total a transferir: $80.00',
                )
            })
        })

        it('si el premio cambió durante el checkout, el pedido no se crea y el cliente confirma el nuevo total', () => {
            customerWithReward().then(({ customer, token }) => {
                visitMenu({ token })
                openCheckout(customer)
                cy.get('[data-cy="checkout-loyalty-toggle"]').check()
                cy.get('[data-cy="checkout-total"]').should('contain', '$80.00')
                // El dueño canjea el premio en el local mientras el cliente decide.
                owner('GET', `/businesses/loyalty/cards/${customer.id}`).then((response) => {
                    const reward = response.body.rewards.find(
                        (item: { status: string }) => item.status === 'AVAILABLE',
                    )
                    owner('POST', `/businesses/loyalty/rewards/${reward.id}/redeem`, {})
                        .its('status')
                        .should('eq', 200)
                })
                cy.contains('button', 'Confirmar pedido').click()
                cy.wait('@createOrder').its('response.statusCode').should('eq', 409)
                cy.get('[data-cy="checkout-loyalty-changed"]').should(
                    'contain',
                    'Tu pedido no se envió',
                )
                cy.get('[data-cy="checkout-loyalty-toggle"]').should('not.exist')
                cy.get('[data-cy="checkout-total"]').should('contain', `$${PRODUCT_PRICE}.00`)
                owner('GET', `/businesses/customers/${customer.id}/orders`)
                    .its('body.total')
                    .should('eq', 0)
            })
        })
    })

    describe('pedido realizado y token', () => {
        it('un cliente nuevo guarda su token y "Pedido realizado" muestra su tarjeta', () => {
            const customer = { name: 'Nuevo Cliente', phone: uniquePhone() }
            visitMenu()
            openCheckout(customer)
            cy.contains('button', 'Confirmar pedido').click()
            cy.wait('@createOrder').then(({ response }) => {
                const token = response?.body.order.loyaltyCardToken as string
                expect(token).to.match(/^[A-Za-z0-9_-]{43}$/)
                cy.window()
                    .its('localStorage')
                    .invoke('getItem', tokenKey(seed.a.slug))
                    .should('eq', token)
            })
            cy.get('[data-cy="order-confirmation-loyalty"]').within(() => {
                cy.get('[data-testid="loyalty-card"]').should(
                    'have.attr',
                    'aria-label',
                    'Tarjeta de lealtad: 0 de 8 sellos',
                )
                cy.contains('Tu sello se agrega cuando recibas tu pedido.').should('be.visible')
                cy.get('[data-cy="order-confirmation-loyalty-link"]')
                    .should('have.attr', 'href')
                    .and('match', /^\/tarjeta\//)
            })
        })

        it('un cliente existente identificado por teléfono no recibe token', () => {
            customerWithStamps(seed.a, 3, 'Tere Existe').then((customer) => {
                visitMenu()
                openCheckout(customer)
                cy.contains('button', 'Confirmar pedido').click()
                cy.wait('@createOrder')
                    .its('response.body.order')
                    .should('not.have.property', 'loyaltyCardToken')
                cy.window()
                    .its('localStorage')
                    .invoke('getItem', tokenKey(seed.a.slug))
                    .should('eq', null)
                cy.get('[data-cy="order-confirmation-loyalty"]').should(
                    'contain',
                    'Junta 8 sellos y gana 20% de descuento.',
                )
                cy.get(
                    '[data-cy="order-confirmation-loyalty"] [data-testid="loyalty-card"]',
                ).should('not.exist')
            })
        })
    })

    describe('página pública de la tarjeta', () => {
        it('muestra la tarjeta, el historial solo con fechas y "Hacer un pedido"', () => {
            customerWithStamps(seed.a, 3, 'Ana López Pérez').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitCard(token)
                    cy.contains('h1', 'Hola, Ana').should('be.visible')
                    cy.get('[data-testid="loyalty-card"]').should(
                        'have.attr',
                        'aria-label',
                        'Tarjeta de lealtad: 3 de 8 sellos',
                    )
                    cy.get('[data-testid="loyalty-progress-text"]').should(
                        'have.text',
                        'Te faltan 5 sellos para tu premio',
                    )
                    cy.get('[data-cy="loyalty-public-history"] li').should('have.length', 3)
                    cy.get('body').should('not.contain', customer.phone).and('not.contain', 'López')
                    cy.get('[data-cy="loyalty-public-order"]').should(
                        'have.attr',
                        'href',
                        `/${seed.a.slug}`,
                    )
                    // Abrir el link deja la llave guardada para el checkout de ese restaurante.
                    cy.window()
                        .its('localStorage')
                        .invoke('getItem', tokenKey(seed.a.slug))
                        .should('eq', token)
                })
            })
        })

        it('anima solo los sellos nuevos y no repite al recargar', () => {
            customerWithStamps(seed.a, 2, 'Uri Anima').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitCard(token)
                    // Primera vez: se animan los sellos que no había visto.
                    cy.get('[data-testid="loyalty-stamp-1"]').should('have.class', 'lc-slot--enter')
                    cy.get('[data-testid="loyalty-announcement"]').should(
                        'have.text',
                        'Ganaste un sello',
                    )
                    cy.reload()
                    cy.wait('@card')
                    cy.get('[data-testid="loyalty-stamp-2"]').should(
                        'have.attr',
                        'data-filled',
                        'true',
                    )
                    cy.get('.lc-slot--enter').should('not.exist')
                    // Llega un sello nuevo: solo ese se anima.
                    asOwner(seed.a)
                    walkInStamp(customer.id).its('status').should('eq', 201)
                    visitCard(token, { keepSeen: true })
                    cy.get('[data-testid="loyalty-stamp-3"]').should('have.class', 'lc-slot--enter')
                    cy.get('[data-testid="loyalty-stamp-2"]').should(
                        'not.have.class',
                        'lc-slot--enter',
                    )
                })
            })
        })

        it('al completar la tarjeta muestra el premio con su vigencia', () => {
            saveProgram({ rewardExpiresDays: 30 })
            customerWithStamps(seed.a, 8, 'Vale Completa').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitCard(token)
                    cy.get('[data-testid="loyalty-card"]').should(
                        'have.attr',
                        'aria-label',
                        'Tarjeta de lealtad: 8 de 8 sellos, premio disponible',
                    )
                    cy.get('[data-cy="loyalty-public-reward"]')
                        .should('contain', 'Tienes un premio: 20% de descuento')
                        .and('contain', 'Úsalo antes del')
                    cy.get('[data-testid="loyalty-announcement"]').should(
                        'have.text',
                        'Completaste tu tarjeta',
                    )
                })
            })
        })

        it('con movimiento reducido no se aplican clases de movimiento', () => {
            customerWithStamps(seed.a, 2, 'Wen Reduce').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitCard(token, { reducedMotion: true })
                    cy.get('[data-testid="loyalty-card"]').should(
                        'have.attr',
                        'data-reduced-motion',
                        'true',
                    )
                    cy.get('[data-testid="loyalty-stamp-1"]')
                        .should('have.class', 'lc-fx-fade')
                        .and('not.have.class', 'lc-fx-press')
                    cy.get('.lc-ripple, .lc-flash, .lc-sparkle').should('not.exist')
                })
            })
        })

        it('un token inválido muestra una pantalla amable sin pistas', () => {
            for (const token of ['x'.repeat(43), 'corto']) {
                cy.visit(`/tarjeta/${token}`)
                cy.get('[data-cy="loyalty-public-not-found"]').should(
                    'contain',
                    'No encontramos esta tarjeta',
                )
                cy.get('body').should('not.contain', seed.a.name).and('not.contain', seed.c.name)
            }
        })

        it('con el programa pausado avisa que los sellos se conservan', () => {
            customerWithStamps(seed.a, 1, 'Ximena Pausa').then((customer) => {
                cardToken(customer.id).then((token) => {
                    saveProgram({ enabled: false })
                    visitCard(token)
                    cy.get('[data-cy="loyalty-public-paused"]').should(
                        'contain',
                        'Tus sellos y premios se conservan',
                    )
                })
            })
        })

        it('responde con noindex, no-store y no-referrer', () => {
            cy.request(`/tarjeta/${'x'.repeat(43)}`).then((response) => {
                expect(response.headers['x-robots-tag']).to.contain('noindex')
                // En producción es "no-store"; el servidor de desarrollo de Next lo reescribe a
                // "no-cache, must-revalidate" (verificado con `next start`).
                expect(response.headers['cache-control']).to.match(/no-store|no-cache/)
                expect(response.headers['referrer-policy']).to.eq('no-referrer')
                expect(response.body).to.contain('noindex')
            })
        })

        it('en celular la página cabe y los botones miden al menos 44 px', () => {
            cy.viewport(375, 740)
            customerWithStamps(seed.a, 4, 'Yola Movil').then((customer) => {
                cardToken(customer.id).then((token) => {
                    visitCard(token)
                    cy.document().its('documentElement.scrollWidth').should('be.lte', 375)
                    cy.get('[data-cy="loyalty-public-order"]')
                        .invoke('outerHeight')
                        .should('be.gte', 44)
                })
            })
        })
    })
})
