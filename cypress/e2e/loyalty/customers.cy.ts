// Tarjeta de lealtad en Clientes (/dashboard/customers). Fase 6.
import {
    asOwner,
    cardDetail,
    customerWithStamps,
    loginOwnerUi,
    type LoyaltySeed,
    owner,
    saveProgram,
    seedLoyalty,
    type SeedCustomer,
} from './loyaltySupport'

let seed: LoyaltySeed

function visitCustomers(search?: string) {
    // La lista se pide con el negocio de la sesión guardada en el navegador; al cambiar de
    // cuenta entre pruebas, primero puede salir la anterior. Se espera la del negocio A.
    cy.intercept('GET', `**/api/v1/businesses/${seed.a.businessId}/customers*`).as('customers')
    cy.visit('/dashboard/customers')
    cy.wait('@customers')
    cy.get('input[aria-label="Buscar clientes por nombre o teléfono"]').should('be.enabled')
    if (search) {
        cy.get('input[aria-label="Buscar clientes por nombre o teléfono"]').type(search)
        cy.wait('@customers')
    }
}

function rowOf(customer: SeedCustomer) {
    return cy.contains('p', customer.phone).parents('div.flex.flex-col').first()
}

function openMenu(customer: SeedCustomer) {
    cy.get(`button[aria-label="Acciones de ${customer.name}"]`).click()
}

function openPanel(customer: SeedCustomer) {
    openMenu(customer)
    cy.get('[data-cy="customer-loyalty-view"]').click()
    cy.get('[data-cy="loyalty-card-panel"]').should('be.visible')
}

describe('Lealtad · Clientes', () => {
    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
        loginOwnerUi(seed.a)
    })

    it('cada cliente muestra su avance "5 de 8" y la etiqueta si tiene premio', () => {
        customerWithStamps(seed.a, 5, 'Ana Cinco').then((five) => {
            visitCustomers(five.phone)
            rowOf(five).within(() => {
                cy.get('[data-testid="loyalty-progress-text"]').should('have.text', '5 de 8')
                cy.get('[data-testid="loyalty-card"]').should(
                    'have.attr',
                    'aria-label',
                    'Tarjeta de lealtad: 5 de 8 sellos',
                )
                cy.get('[data-testid="loyalty-reward"]').should('not.exist')
            })
        })
        customerWithStamps(seed.a, 8, 'Beto Premio').then((full) => {
            visitCustomers(full.phone)
            rowOf(full).within(() => {
                cy.get('[data-testid="loyalty-progress-text"]').should('have.text', '8 de 8')
                cy.get('[data-testid="loyalty-reward"]')
                    .should('be.visible')
                    .and('have.text', 'Premio')
            })
        })
    })

    it('muestra las tres métricas', () => {
        owner('GET', '/businesses/loyalty/summary').then((response) => {
            visitCustomers()
            cy.get('[data-cy="loyalty-metric-active"]').should(
                'have.text',
                String(response.body.summary.activeCards),
            )
            cy.get('[data-cy="loyalty-metric-week"]').should(
                'have.text',
                String(response.body.summary.stampsThisWeek),
            )
            cy.get('[data-cy="loyalty-metric-pending"]').should(
                'have.text',
                String(response.body.summary.pendingRewards),
            )
        })
    })

    it('filtro "Cerca del premio" muestra a quien le faltan 1 o 2 sellos', () => {
        customerWithStamps(seed.a, 7, 'Cerca Siete').then((near) => {
            customerWithStamps(seed.a, 3, 'Lejos Tres').then((far) => {
                visitCustomers(near.phone.slice(0, 7))
                cy.get('[data-cy="loyalty-filter-near"]')
                    .click()
                    .should('have.attr', 'aria-checked', 'true')
                cy.get('[data-cy="loyalty-filtered-list"]').should('contain', near.phone)
                cy.get('[data-cy="loyalty-filtered-list"]').should('not.contain', far.phone)
            })
        })
    })

    it('filtro "Con premio disponible"', () => {
        customerWithStamps(seed.a, 8, 'Con Premio').then((winner) => {
            visitCustomers(winner.phone)
            cy.get('[data-cy="loyalty-filter-reward"]').click()
            cy.get('[data-cy="loyalty-filtered-row"]')
                .should('have.length', 1)
                .and('contain', winner.phone)
            cy.get('[data-cy="loyalty-filter-all"]').click()
            rowOf(winner).should('exist')
        })
    })

    it('el panel de la tarjeta muestra el historial de sellos y premios', () => {
        customerWithStamps(seed.a, 8, 'Dora Historial').then((customer) => {
            visitCustomers(customer.phone)
            openPanel(customer)
            cy.get('[data-cy="loyalty-card-panel"]').within(() => {
                cy.get('[data-testid="loyalty-card"]').should(
                    'have.attr',
                    'aria-label',
                    'Tarjeta de lealtad: 8 de 8 sellos, premio disponible',
                )
                cy.get('[data-cy="loyalty-history-stamp"]')
                    .should('have.length', 8)
                    .first()
                    .should('contain', 'En el local')
                    .and('contain', 'E2E Lealtad Café')
                cy.get('[data-cy="loyalty-panel-reward"]')
                    .should('contain', '20% de descuento')
                    .and('contain', 'Disponible')
            })
            cy.get('body').type('{esc}')
            cy.get('[data-cy="loyalty-card-panel"]').should('not.exist')
        })
    })

    it('dar sello con nota desde el panel reproduce la animación y queda en el historial', () => {
        customerWithStamps(seed.a, 2, 'Eva Nota').then((customer) => {
            visitCustomers(customer.phone)
            openPanel(customer)
            cy.get('[data-cy="loyalty-panel-add-note"]').click()
            cy.get('[data-cy="loyalty-panel-note"]').type('compra en caja')
            cy.intercept('POST', '**/loyalty/customers/*/stamps').as('stamp')
            cy.get('[data-cy="loyalty-panel-stamp"]').click()
            cy.wait('@stamp').its('response.statusCode').should('eq', 201)
            cy.get('[data-cy="loyalty-card-panel"] [data-testid="loyalty-stamp-3"]').should(
                'have.attr',
                'data-filled',
                'true',
            )
            cy.get('[data-cy="loyalty-card-panel"] [data-testid="loyalty-card"]').should(
                'have.attr',
                'data-phase',
            )
            cy.contains('Sello dado a Eva (3 de 8)').should('be.visible')
            cy.get('[data-cy="loyalty-history-stamp"]')
                .first()
                .should('contain', 'Nota: compra en caja')
            rowOf(customer)
                .find('[data-testid="loyalty-progress-text"]')
                .should('have.text', '3 de 8')
        })
    })

    it('anular un sello pide motivo y lo deja en el historial', () => {
        customerWithStamps(seed.a, 3, 'Fer Anula').then((customer) => {
            visitCustomers(customer.phone)
            openPanel(customer)
            cy.get('[data-cy="loyalty-history-void"]').first().click()
            cy.get('[data-cy="loyalty-void-confirm"]').should('be.disabled')
            cy.get('[data-cy="loyalty-void-reason"]').type('sello duplicado')
            cy.get('[data-cy="loyalty-void-confirm"]').click()
            cy.get('[data-cy="loyalty-history-stamp"][data-voided="true"]')
                .should('have.length', 1)
                .and('contain', 'sello duplicado')
            cardDetail(customer.id).its('body.card.stampsCount').should('eq', 2)
        })
    })

    it('"Enviar tarjeta por WhatsApp" genera un enlace wa.me correcto', () => {
        customerWithStamps(seed.a, 4, 'Gaby Whats').then((customer) => {
            cardDetail(customer.id)
                .its('body.card.cardToken')
                .then((token) => {
                    visitCustomers(customer.phone)
                    const popup = { opener: {}, location: { href: '' }, close: cy.stub() }
                    cy.window().then((window) => {
                        cy.stub(window, 'open').as('open').returns(popup)
                    })
                    openMenu(customer)
                    cy.get('[data-cy="customer-loyalty-whatsapp"]').click()
                    cy.get('@open').should('have.been.calledWith', 'about:blank', '_blank')
                    cy.wrap(popup.location)
                        .its('href')
                        .should('match', new RegExp(`^https://wa\\.me/52${customer.phone}\\?text=`))
                    cy.wrap(popup.location)
                        .its('href')
                        .then((href) => {
                            const text = decodeURIComponent(String(href).split('?text=')[1])
                            expect(text).to.contain(
                                'Hola Gaby, esta es tu tarjeta de lealtad de E2E Lealtad Café.',
                            )
                            expect(text).to.contain(
                                'Llevas 4 de 8 sellos. Al completarla ganas 20% de descuento.',
                            )
                            expect(text).to.contain(`/tarjeta/${token}`)
                        })
                })
        })
    })

    it('dar sello desde el menú de tres puntos actualiza el avance al instante', () => {
        customerWithStamps(seed.a, 1, 'Hugo Menu').then((customer) => {
            visitCustomers(customer.phone)
            rowOf(customer)
                .find('[data-testid="loyalty-progress-text"]')
                .should('have.text', '1 de 8')
            cy.intercept('POST', '**/loyalty/customers/*/stamps', (request) => {
                request.on('response', (response) => {
                    response.setDelay(600)
                })
            }).as('stamp')
            openMenu(customer)
            cy.get('[data-cy="customer-loyalty-stamp"]').click()
            // Optimista: cambia antes de que responda el servidor.
            rowOf(customer)
                .find('[data-testid="loyalty-progress-text"]')
                .should('have.text', '2 de 8')
            cy.wait('@stamp')
            cardDetail(customer.id).its('body.card.stampsCount').should('eq', 2)
        })
    })

    it('si el servidor rechaza el sello, el avance se revierte y se avisa', () => {
        customerWithStamps(seed.a, 1, 'Iris Error').then((customer) => {
            visitCustomers(customer.phone)
            rowOf(customer)
                .find('[data-testid="loyalty-progress-text"]')
                .should('have.text', '1 de 8')
            cy.intercept('POST', '**/loyalty/customers/*/stamps', {
                statusCode: 429,
                body: {
                    error: {
                        code: 'LOYALTY_WALK_IN_LIMIT',
                        message: 'Este cliente ya recibió 5 sellos en el local hoy.',
                    },
                },
            }).as('stamp')
            openMenu(customer)
            cy.get('[data-cy="customer-loyalty-stamp"]').click()
            cy.wait('@stamp')
            cy.contains('Este cliente ya recibió 5 sellos en el local hoy.').should('be.visible')
            rowOf(customer)
                .find('[data-testid="loyalty-progress-text"]')
                .should('have.text', '1 de 8')
        })
    })

    it('canjear premio desde el panel', () => {
        customerWithStamps(seed.a, 8, 'Juan Canje').then((customer) => {
            visitCustomers(customer.phone)
            openMenu(customer)
            cy.get('[data-cy="customer-loyalty-redeem"]').click()
            cy.on('window:confirm', () => true)
            cy.get('[data-cy="loyalty-panel-redeem"]').click()
            cy.get('[data-cy="loyalty-panel-reward"]').should('contain', 'Canjeado')
            cardDetail(customer.id).its('body.rewards.0.status').should('eq', 'REDEEMED')
        })
    })

    it('en celular "Ver tarjeta" abre una hoja inferior', () => {
        cy.viewport(390, 844)
        customerWithStamps(seed.a, 2, 'Kari Movil').then((customer) => {
            visitCustomers(customer.phone)
            openPanel(customer)
            cy.get('[data-cy="loyalty-card-panel"]').then(($panel) => {
                // Hoja inferior: a todo lo ancho y pegada abajo (sobre la barra de navegación).
                const rect = $panel[0].getBoundingClientRect()
                expect(rect.left).to.eq(0)
                expect(rect.width).to.be.closeTo(390, 1)
                // La barra de navegación inferior mide 64 px.
                expect(rect.bottom).to.be.within(844 - 80, 844)
                expect(rect.top).to.be.at.least(0)
            })
            cy.get('[data-cy="loyalty-panel-stamp"]').invoke('outerHeight').should('be.gte', 44)
        })
    })

    it('con el programa pausado no se muestra nada de lealtad', () => {
        saveProgram({ enabled: false })
        customerWithStamps(seed.a, 0, 'Luz Pausa').then((customer) => {
            visitCustomers(customer.phone)
            cy.contains('p', customer.phone).should('be.visible')
            cy.get('[data-cy="loyalty-metrics"]').should('not.exist')
            cy.get('[data-cy="customer-loyalty-progress"]').should('not.exist')
            openMenu(customer)
            cy.get('[data-cy="customer-loyalty-view"]').should('not.exist')
        })
    })
})
