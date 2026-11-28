import {
    logout,
    newAccountEmail,
    registerAndLogin,
    uniqueSuffix,
    watchRealBackendRequests,
} from '../../support/realBackendFlow'

// Humo de autenticación con backend real: sesión, credenciales incorrectas, correo repetido
// y rutas protegidas. Se salta si no hay contraseña de registro (CYPRESS_TEST_REGISTER_PASSWORD).

describe('Humo · autenticación real', () => {
    it('rechaza credenciales incorrectas y correos repetidos, y protege el dashboard', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }
            const credentials = {
                email: newAccountEmail('auth', uniqueSuffix(), testRegisterEmail),
                password: testRegisterPassword,
            }

            watchRealBackendRequests()
            registerAndLogin(credentials)
            logout()

            // Sin sesión, las rutas privadas mandan al login.
            cy.visit('/dashboard/orders')
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')

            // Contraseña incorrecta: error visible y sin sesión.
            cy.get('[data-testid="login-email"]').type(credentials.email)
            cy.get('[data-testid="login-password"]').type(`${credentials.password}-mal`)
            cy.get('[data-testid="login-submit"]').click()
            cy.get('[role="alert"]').should('be.visible')
            cy.location('pathname').should('eq', '/auth/login')

            // Registrar el mismo correo otra vez: el backend lo rechaza.
            cy.visit('/auth/register')
            cy.get('[data-testid="register-name"]').type('Cypress Repetido')
            cy.get('[data-testid="register-email"]').type(credentials.email)
            cy.get('[data-testid="register-password"]').type(credentials.password)
            cy.get('[data-testid="register-confirm-password"]').type(credentials.password)
            cy.get('[data-testid="register-legal"]').check()
            cy.get('[data-testid="register-submit"]').click()
            cy.get('[role="alert"]').should('be.visible')
            cy.location('pathname').should('eq', '/auth/register')
        })
    })
})
