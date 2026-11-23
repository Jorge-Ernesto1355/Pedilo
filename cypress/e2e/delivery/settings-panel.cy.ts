import { assertPageFitsViewport, assertTouchTargets } from '../../support/responsive'
import {
    type DeliverySeed,
    loginAsDeliveryOwner,
    revealDeliverySettings,
    seedDelivery,
    stubMapServices,
} from './deliverySupport'

// Panel "Envío a domicilio" en /create-menu. La API de configuración se simula para
// controlar cada estado; settings-persistence.cy.ts cubre el guardado real.

const SETTINGS_URL = '**/api/v1/businesses/delivery-settings'
const origin = { latitude: 23.2494, longitude: -106.4111 }

function settings(overrides: Record<string, unknown> = {}) {
    return {
        deliverySettings: {
            enabled: false,
            origin: null,
            maxDeliveryKm: null,
            feeConfig: null,
            routeFactor: 1.3,
            ...overrides,
        },
    }
}

let seed: DeliverySeed

function visitPanel(body: unknown) {
    loginAsDeliveryOwner(seed)
    stubMapServices()
    cy.intercept('GET', SETTINGS_URL, { statusCode: 200, body }).as('getDelivery')
    cy.visit('/create-menu')
    revealDeliverySettings()
    cy.wait('@getDelivery')
    cy.get('[data-cy="delivery-settings-skeleton"]').should('not.exist')
}

function countSaves() {
    const counter = { saves: 0 }
    cy.intercept('PUT', SETTINGS_URL, (request) => {
        counter.saves += 1
        request.reply({ statusCode: 200, body: settings(request.body) })
    }).as('saveDelivery')
    return counter
}

function fillTier(index: number, km: string, fee: string) {
    cy.get('[data-cy="delivery-tier-row"]')
        .eq(index)
        .within(() => {
            cy.get('[data-cy="delivery-tier-km"]').clear().type(km)
            cy.get('[data-cy="delivery-tier-fee"]').clear().type(fee)
        })
}

function enable() {
    cy.get('[data-cy="delivery-enabled-toggle"]').check({ force: true })
}

describe('Envío a domicilio · panel de ajustes', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    it('muestra un skeleton mientras carga la configuración', () => {
        loginAsDeliveryOwner(seed)
        stubMapServices()
        cy.intercept('GET', SETTINGS_URL, (request) =>
            request.reply({ delay: 800, statusCode: 200, body: settings() }),
        ).as('getDelivery')
        cy.visit('/create-menu')
        revealDeliverySettings()
        cy.get('[data-cy="delivery-settings-skeleton"]').should('be.visible')
        cy.wait('@getDelivery')
        cy.get('[data-cy="delivery-settings-skeleton"]').should('not.exist')
        cy.contains('h2', 'Envío a domicilio').should('be.visible')
    })

    it('si falla la carga muestra un error discreto y permite reintentar', () => {
        loginAsDeliveryOwner(seed)
        stubMapServices()
        // Falla hasta que la persona toca "Reintentar" (React Query ya reintenta una vez solo).
        const server = { healthy: false }
        cy.intercept('GET', SETTINGS_URL, (request) => {
            if (server.healthy) request.reply({ statusCode: 200, body: settings() })
            else request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
        }).as('getDelivery')
        cy.visit('/create-menu')
        revealDeliverySettings()
        cy.get('[data-cy="delivery-settings-load-error"]', { timeout: 15_000 })
            .should('be.visible')
            .and('have.attr', 'role', 'alert')
        cy.then(() => {
            server.healthy = true
        })
        cy.get('[data-cy="delivery-settings-retry"]').click()
        cy.contains('h2', 'Envío a domicilio').should('be.visible')
        cy.get('[data-cy="delivery-settings-load-error"]').should('not.exist')
    })

    it('sin ubicación del restaurante pide marcarla y no muestra mapa', () => {
        visitPanel(settings())
        cy.get('[data-cy="delivery-origin-empty"]').should('contain', 'Marca la ubicación')
        cy.get('[data-cy="delivery-origin-map"]').should('not.exist')
        cy.get('[data-cy="delivery-status"]').should('have.text', 'Inactivo')
    })

    it('con ubicación muestra el mapa con la atribución de OpenStreetMap', () => {
        visitPanel(settings({ origin, maxDeliveryKm: 5 }))
        cy.get('[data-cy="delivery-origin-map"]')
            .should('be.visible')
            .and('contain', 'OpenStreetMap')
        cy.get('[data-cy="delivery-origin-map"] .leaflet-marker-icon').should('exist')
        cy.get('[data-cy="delivery-origin-map"] path.leaflet-interactive').should('exist')
    })

    it('activar sin ubicación, radio ni tarifa muestra los errores y no guarda', () => {
        visitPanel(settings())
        const counter = countSaves()
        enable()
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.get('[data-cy="delivery-issue-ORIGIN_MISSING"]').should('be.visible')
        cy.get('[data-cy="delivery-issue-MAX_KM_MISSING"]').should('be.visible')
        cy.get('[data-cy="delivery-issue-NO_TIERS"]').should('be.visible')
        cy.then(() => expect(counter.saves).to.eq(0))
    })

    it('exige que los tramos vayan de menor a mayor', () => {
        visitPanel(settings({ origin }))
        const counter = countSaves()
        fillTier(0, '5', '50')
        cy.get('[data-cy="delivery-tier-add"]').click()
        fillTier(1, '2', '30')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.get('[data-cy="delivery-issue-TIER_KM_NOT_ASCENDING"]').should('be.visible')
        cy.then(() => expect(counter.saves).to.eq(0))
    })

    it('exige que el último tramo llegue al radio máximo', () => {
        visitPanel(settings({ origin }))
        const counter = countSaves()
        cy.get('[data-cy="delivery-max-km-input"]').type('6')
        fillTier(0, '5', '50')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.get('[data-cy="delivery-issue-TIERS_DO_NOT_COVER_MAX_KM"]').should('be.visible')
        cy.then(() => expect(counter.saves).to.eq(0))
    })

    it('rechaza km con más de un decimal y envíos en cero', () => {
        visitPanel(settings({ origin }))
        fillTier(0, '2.25', '0')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.get('[data-cy="delivery-issue-TIER_KM_INVALID"]').should('be.visible')
        cy.get('[data-cy="delivery-issue-TIER_FEE_INVALID"]').should('be.visible')
    })

    it('permite agregar hasta 10 tramos y quitarlos', () => {
        visitPanel(settings({ origin }))
        for (let index = 1; index < 10; index += 1) cy.get('[data-cy="delivery-tier-add"]').click()
        cy.get('[data-cy="delivery-tier-row"]').should('have.length', 10)
        cy.get('[data-cy="delivery-tier-add"]').should('be.disabled')
        cy.get('[data-cy="delivery-tier-remove"]').first().click()
        cy.get('[data-cy="delivery-tier-row"]').should('have.length', 9)
        cy.get('[data-cy="delivery-tier-add"]').should('not.be.disabled')
    })

    it('guarda la tarifa por tramos como números y muestra el estado activo', () => {
        visitPanel(settings({ origin }))
        countSaves()
        enable()
        cy.get('[data-cy="delivery-max-km-input"]').type('5')
        fillTier(0, '2', '30')
        cy.get('[data-cy="delivery-tier-add"]').click()
        fillTier(1, '5', '50.5')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.wait('@saveDelivery')
            .its('request.body')
            .should('deep.equal', {
                enabled: true,
                maxDeliveryKm: 5,
                feeConfig: {
                    type: 'DISTANCE_TIERS',
                    tiers: [
                        { upToKm: 2, fee: 30 },
                        { upToKm: 5, fee: 50.5 },
                    ],
                },
            })
        cy.get('[data-cy="delivery-settings-saved"]').should('contain', 'Envío guardado')
        cy.get('[data-cy="delivery-status"]').should('have.text', 'Activo')
    })

    it('al cambiar la ubicación envía el nuevo punto al guardar', () => {
        visitPanel(
            settings({
                origin,
                maxDeliveryKm: 5,
                feeConfig: { type: 'DISTANCE_TIERS', tiers: [{ upToKm: 5, fee: 50 }] },
            }),
        )
        countSaves()
        cy.get('[data-cy="delivery-origin-edit"]').click()
        cy.get('#latitude').clear().type('23.2501')
        cy.get('#longitude').clear().type('-106.4202')
        cy.contains('button', 'Guardar ubicación').click()
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.wait('@saveDelivery')
            .its('request.body.origin')
            .should('deep.equal', { latitude: 23.2501, longitude: -106.4202 })
    })

    it('muestra los errores de validación que devuelve el servidor', () => {
        visitPanel(settings({ origin }))
        cy.intercept('PUT', SETTINGS_URL, {
            statusCode: 400,
            body: {
                error: {
                    code: 'DELIVERY_SETTINGS_INVALID',
                    message: 'Delivery settings are invalid',
                    details: { issues: ['ORIGIN_MISSING'] },
                },
            },
        }).as('saveDelivery')
        fillTier(0, '3', '40')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.wait('@saveDelivery')
        cy.get('[data-cy="delivery-issue-ORIGIN_MISSING"]').should('be.visible')
        cy.get('[data-cy="delivery-settings-saved"]').should('not.exist')
    })

    it('un error inesperado al guardar se muestra sin alertas intrusivas', () => {
        visitPanel(settings({ origin }))
        cy.window().then((win) => cy.stub(win, 'alert').as('alert'))
        cy.intercept('PUT', SETTINGS_URL, {
            statusCode: 500,
            body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        }).as('saveDelivery')
        fillTier(0, '3', '40')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.wait('@saveDelivery')
        cy.get('[data-cy="delivery-settings-error"]').should('contain', 'No pudimos guardar')
        cy.get('@alert').should('not.have.been.called')
    })

    it('en móvil (375×812) el panel cabe sin desbordar y sus controles son táctiles', () => {
        cy.viewport(375, 812)
        visitPanel(settings({ origin, maxDeliveryKm: 5 }))
        cy.get('[data-cy="delivery-settings"]').scrollIntoView()
        assertPageFitsViewport()
        assertTouchTargets('[data-cy="delivery-settings-save"]')
        assertTouchTargets('[data-cy="delivery-tier-add"]')
        assertTouchTargets('[data-cy="delivery-origin-edit"]')
    })
})
