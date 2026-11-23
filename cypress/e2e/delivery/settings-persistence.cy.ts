import {
    type DeliverySeed,
    loginAsDeliveryOwner,
    revealDeliverySettings,
    seedDelivery,
    stubMapServices,
} from './deliverySupport'

// Guardado real contra el backend local (sin simular la API). El seed restablece
// la configuración antes y después para no dejar estado entre pruebas.

let seed: DeliverySeed

function openPanel() {
    stubMapServices()
    cy.intercept('GET', '**/api/v1/businesses/delivery-settings').as('getDelivery')
    cy.visit('/create-menu')
    revealDeliverySettings()
    cy.wait('@getDelivery')
    cy.get('[data-cy="delivery-settings-skeleton"]').should('not.exist')
}

describe('Envío a domicilio · guardado real', () => {
    before(() => {
        seedDelivery().then((value) => {
            seed = value
        })
    })

    after(() => {
        seedDelivery()
    })

    it('guarda radio y tramos en el backend y se conservan al recargar', () => {
        loginAsDeliveryOwner(seed)
        openPanel()
        cy.get('[data-cy="delivery-status"]').should('have.text', 'Activo')
        cy.get('[data-cy="delivery-max-km-input"]').clear().type('4')
        cy.get('[data-cy="delivery-tier-row"]')
            .eq(0)
            .within(() => {
                cy.get('[data-cy="delivery-tier-km"]').clear().type('1.5')
                cy.get('[data-cy="delivery-tier-fee"]').clear().type('25')
            })
        cy.get('[data-cy="delivery-tier-row"]')
            .eq(1)
            .within(() => {
                cy.get('[data-cy="delivery-tier-km"]').clear().type('4')
                cy.get('[data-cy="delivery-tier-fee"]').clear().type('45')
            })
        cy.intercept('PUT', '**/api/v1/businesses/delivery-settings').as('saveDelivery')
        cy.get('[data-cy="delivery-settings-save"]').click()
        cy.wait('@saveDelivery').its('response.statusCode').should('eq', 200)
        cy.get('[data-cy="delivery-settings-saved"]').should('be.visible')

        cy.reload()
        revealDeliverySettings()
        cy.get('[data-cy="delivery-settings-skeleton"]').should('not.exist')
        cy.get('[data-cy="delivery-max-km-input"]').should('have.value', '4')
        cy.get('[data-cy="delivery-tier-km"]').eq(0).should('have.value', '1.5')
        cy.get('[data-cy="delivery-tier-fee"]').eq(0).should('have.value', '25')
        cy.get('[data-cy="delivery-tier-km"]').eq(1).should('have.value', '4')
        cy.get('[data-cy="delivery-tier-fee"]').eq(1).should('have.value', '45')
    })
})
