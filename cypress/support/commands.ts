/* eslint-disable @typescript-eslint/no-namespace */

declare global {
    namespace Cypress {
        interface Chainable {
            login(options?: { email?: string; password?: string }): Chainable<void>
        }
    }
}

Cypress.Commands.add('login', ({ email, password } = {}) => {
    cy.env(['testUserEmail', 'testUserPassword']).then(({ testUserEmail, testUserPassword }) => {
        const testEmail = email ?? testUserEmail
        const testPassword = password ?? testUserPassword

        if (!testEmail || !testPassword) {
            throw new Error(
                'Configura CYPRESS_TEST_USER_EMAIL y CYPRESS_TEST_USER_PASSWORD para usar cy.login().',
            )
        }

        cy.session(
            [testEmail, testPassword],
            () => {
                cy.visit('/auth/login')
                cy.get('[data-testid="login-email"]').type(testEmail)
                cy.get('[data-testid="login-password"]').type(testPassword)
                cy.get('[data-testid="login-submit"]').click()
                cy.location('pathname').should('eq', '/dashboard')
            },
            {
                validate() {
                    cy.visit('/dashboard')
                    cy.location('pathname').should('eq', '/dashboard')
                },
            },
        )
        cy.visit('/dashboard')
    })
})

export {}
