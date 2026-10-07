describe('Auth · aislamiento de cache entre cuentas', () => {
    it('no muestra datos de A mientras carga el dashboard de B', function () {
        cy.env([
            'testAccountAEmail',
            'testAccountAPassword',
            'testAccountBEmail',
            'testAccountBPassword',
            'testAccountAMarker',
            'testAccountBMarker',
        ]).then(function (env) {
            const {
                testAccountAEmail,
                testAccountAPassword,
                testAccountBEmail,
                testAccountBPassword,
                testAccountAMarker,
                testAccountBMarker,
            } = env

            if (
                !testAccountAEmail ||
                !testAccountAPassword ||
                !testAccountBEmail ||
                !testAccountBPassword ||
                !testAccountAMarker ||
                !testAccountBMarker
            ) {
                this.skip()
                return
            }

            cy.loginWithApi({ email: testAccountAEmail, password: testAccountAPassword })
            cy.visit('/dashboard')
            cy.contains(testAccountAMarker, { timeout: 15_000 }).should('be.visible')

            cy.get('button[aria-haspopup="menu"]').click()
            cy.get('[role="menuitem"]').contains('Cerrar sesión').click()
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')

            cy.intercept('GET', '**/api/v1/**', (request) => {
                request.on('response', (response) => {
                    response.setDelay(1_000)
                })
            }).as('delayedAccountBData')

            cy.get('[data-testid="login-email"]').type(testAccountBEmail)
            cy.get('[data-testid="login-password"]').type(testAccountBPassword)
            cy.get('[data-testid="login-submit"]').click()

            // The old account must not remain in the DOM while B's requests are pending.
            cy.then(() => {
                expect(document.body.textContent ?? '').not.to.include(testAccountAMarker)
            })
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/dashboard')
            cy.contains(testAccountBMarker, { timeout: 15_000 }).should('be.visible')
            cy.get('body').should('not.contain', testAccountAMarker)

            cy.reload()
            cy.contains(testAccountBMarker, { timeout: 15_000 }).should('be.visible')
            cy.get('body').should('not.contain', testAccountAMarker)
        })
    })
})

export {}
