describe('Auth · Forgot password', () => {
    beforeEach(() => cy.visit('/auth/forgot-password'))

    it('renderiza email y links de navegación', () => {
        cy.get('[data-testid="forgot-password-email"]').should('be.visible')
        cy.get('[data-testid="forgot-password-submit"]').should('be.visible')
        cy.get('a[href="/auth/login"]').should('have.length.at.least', 1)
    })

    it('valida email vacío o inválido sin petición', () => {
        let forgotCalls = 0
        cy.intercept('POST', '**/api/v1/auth/forgot-password', (request) => {
            forgotCalls += 1
            request.continue()
        }).as('forgot')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.get('[role="alert"]').should('be.visible')
        cy.then(() => expect(forgotCalls).to.eq(0))
        cy.get('[data-testid="forgot-password-email"]').type('invalid-email')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.get('[role="alert"]').should('be.visible')
        cy.then(() => expect(forgotCalls).to.eq(0))
    })

    it('verifica payload y muestra éxito genérico', () => {
        cy.intercept('POST', '**/api/v1/auth/forgot-password', (request) => {
            expect(request.body).to.deep.equal({ email: 'owner@example.com' })
            request.reply({ statusCode: 200, body: { success: true } })
        }).as('forgot')
        cy.get('[data-testid="forgot-password-email"]').type(' OWNER@EXAMPLE.COM ')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.wait('@forgot').its('request.method').should('eq', 'POST')
        cy.contains('Revisa tu correo').should('be.visible')
        cy.contains(/si el correo está registrado/i).should('be.visible')
        cy.contains(/token|password|contraseña actual/i).should('not.exist')
    })

    it('muestra error controlado y evita doble submit', () => {
        let forgotCalls = 0
        cy.intercept('POST', '**/api/v1/auth/forgot-password', (request) => {
            forgotCalls += 1
            request.reply({ delay: 1000, statusCode: 503, body: {} })
        }).as('forgot')
        cy.get('[data-testid="forgot-password-email"]').type('owner@example.com')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.get('[data-testid="forgot-password-submit"]').should('be.disabled').and('have.attr', 'aria-busy', 'true')
        cy.get('[data-testid="forgot-password-submit"]').click({ force: true })
        cy.then(() => expect(forgotCalls).to.eq(1))
        cy.wait('@forgot')
        cy.get('[role="alert"]').should('contain', 'No pudimos procesar')
    })

    it('mantiene una respuesta visible equivalente para email registrado y no registrado', () => {
        const genericBody = { success: true }
        cy.intercept('POST', '**/api/v1/auth/forgot-password', { statusCode: 200, body: genericBody }).as('registered')
        cy.get('[data-testid="forgot-password-email"]').type('registered@example.com')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.wait('@registered')
        cy.contains('Revisa tu correo').invoke('text').as('registeredMessage')

        cy.visit('/auth/forgot-password')
        cy.intercept('POST', '**/api/v1/auth/forgot-password', { statusCode: 200, body: genericBody }).as('unknown')
        cy.get('[data-testid="forgot-password-email"]').type('unknown@example.com')
        cy.get('[data-testid="forgot-password-submit"]').click()
        cy.wait('@unknown')
        cy.contains('Revisa tu correo').invoke('text').then((unknownMessage) => {
            cy.get('@registeredMessage').should('eq', unknownMessage)
        })
    })

    it('permite solicitar recuperación real cuando se configura un usuario de prueba', function () {
        cy.env(['testUserEmail']).then(function ({ testUserEmail }) {
            if (!testUserEmail) {
                this.skip()
                return
            }
            cy.get('[data-testid="forgot-password-email"]').type(testUserEmail)
            cy.get('[data-testid="forgot-password-submit"]').click()
            cy.contains('Revisa tu correo', { timeout: 15_000 }).should('be.visible')
        })
    })
})
