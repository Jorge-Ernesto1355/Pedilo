type Credentials = {
    name: string
    email: string
    password: string
}

function uniqueEmail(baseEmail: string | undefined, label: string) {
    const suffix = `${Date.now()}-${Cypress._.random(100, 999)}`
    if (baseEmail?.includes('@')) {
        return baseEmail.replace('@', `+account-session-${label}-${suffix}@`).toLowerCase()
    }
    return `cypress-account-session-${label}-${suffix}@example.test`
}

function register(credentials: Credentials) {
    cy.visit('/auth/register')
    cy.get('[data-testid="register-name"]').type(credentials.name)
    cy.get('[data-testid="register-email"]').type(credentials.email)
    cy.get('[data-testid="register-password"]').type(credentials.password)
    cy.get('[data-testid="register-confirm-password"]').type(credentials.password)
    cy.get('[data-testid="register-terms"]').check()
    cy.get('[data-testid="register-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
}

function login(credentials: Credentials) {
    cy.get('[data-testid="login-email"]').type(credentials.email)
    cy.get('[data-testid="login-password"]').type(credentials.password)
    cy.get('[data-testid="login-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
}

function assertAccountData(credentials: Credentials) {
    cy.visit('/dashboard/account')
    cy.contains('h1', 'Cuenta').should('be.visible')
    cy.contains('dt', 'Nombre').parent().find('dd').should('have.text', credentials.name)
    cy.contains('dt', 'Email').parent().find('dd').should('have.text', credentials.email)
}

function logout() {
    cy.get('button[aria-label^="Abrir menú de "]').click()
    cy.get('[role="menu"] [role="menuitem"]').contains('Cerrar sesión').should('be.visible').click()
    cy.wait('@logout').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
}

describe('Auth · aislamiento de datos entre cuentas', () => {
    it('muestra el nombre y email de la cuenta activa después de cambiar de sesión', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }

            const accountA: Credentials = {
                name: 'Cuenta Cypress A',
                email: uniqueEmail(testRegisterEmail, 'a'),
                password: testRegisterPassword,
            }
            const accountB: Credentials = {
                name: 'Cuenta Cypress B',
                email: uniqueEmail(testRegisterEmail, 'b'),
                password: testRegisterPassword,
            }

            cy.intercept('POST', '/api/auth/logout').as('logout')

            register(accountA)
            login(accountA)
            assertAccountData(accountA)
            logout()

            register(accountB)
            login(accountB)
            assertAccountData(accountB)
            cy.contains('dd', accountA.name).should('not.exist')
            cy.contains('dd', accountA.email).should('not.exist')
        })
    })
})
