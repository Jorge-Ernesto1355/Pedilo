describe('Auth · Login', () => {
    beforeEach(() => cy.visit('/auth/login'))

    it('renderiza el formulario y sus links de autenticación', () => {
        cy.location('pathname').should('eq', '/auth/login')
        cy.get('[data-testid="login-email"]').should('be.visible').and('have.attr', 'type', 'email')
        cy.get('[data-testid="login-password"]')
            .should('be.visible')
            .and('have.attr', 'type', 'password')
        cy.get('[data-testid="login-submit"]').should('be.visible').and('contain', 'Iniciar sesión')
        cy.get('a[href="/auth/forgot-password"]').should('be.visible')
        cy.get('a[href="/auth/register"]').should('be.visible')
    })

    it('valida email inválido sin llamar al backend', () => {
        let loginCalls = 0
        cy.intercept('POST', '/api/auth/login', (request) => {
            loginCalls += 1
            request.continue()
        }).as('login')
        cy.get('[data-testid="login-email"]').type('correo-invalido')
        cy.get('[data-testid="login-password"]').type('correct-horse')
        cy.get('[data-testid="login-submit"]').click()
        cy.get('#err-email').should('be.visible').and('contain', 'correo')
        cy.then(() => expect(loginCalls).to.eq(0))
    })

    it('valida email y password vacíos sin enviar', () => {
        let loginCalls = 0
        cy.intercept('POST', '/api/auth/login', (request) => {
            loginCalls += 1
            request.continue()
        }).as('login')
        cy.get('[data-testid="login-submit"]').click()
        cy.get('#err-email, #err-pass').filter(':visible').should('have.length', 2)
        cy.then(() => expect(loginCalls).to.eq(0))
    })

    it('verifica método y payload en un login controlado', () => {
        cy.intercept('POST', '/api/auth/login', (request) => {
            expect(request.body).to.deep.equal({
                email: 'owner@example.com',
                password: 'correct-horse',
                remember: false,
            })
            request.reply({ statusCode: 401, body: { error: 'Correo o contraseña inválidos.' } })
        }).as('login')

        cy.get('[data-testid="login-email"]').type(' OWNER@EXAMPLE.COM ')
        cy.get('[data-testid="login-password"]').type('correct-horse')
        cy.get('[data-testid="login-submit"]').click()
        cy.wait('@login').its('request.method').should('eq', 'POST')
        cy.get('[role="alert"]').should('contain', 'Correo o contraseña inválidos.')
        cy.location('pathname').should('eq', '/auth/login')
    })

    it('muestra loading y evita doble submit mientras responde', () => {
        let loginCalls = 0
        cy.intercept('POST', '/api/auth/login', (request) => {
            loginCalls += 1
            request.reply({
                delay: 1000,
                statusCode: 401,
                body: { error: 'Correo o contraseña inválidos.' },
            })
        }).as('login')

        cy.get('[data-testid="login-email"]').type('owner@example.com')
        cy.get('[data-testid="login-password"]').type('wrong-password')
        cy.get('[data-testid="login-submit"]').click()
        cy.get('[data-testid="login-submit"]')
            .should('be.disabled')
            .and('have.attr', 'aria-busy', 'true')
        cy.get('[data-testid="login-submit"]').click({ force: true })
        cy.then(() => expect(loginCalls).to.eq(1))
        cy.wait('@login')
    })

    it('permite login real, conserva la sesión al recargar y protege rutas', function () {
        cy.env(['testUserEmail', 'testUserPassword']).then(function ({
            testUserEmail,
            testUserPassword,
        }) {
            cy.login()
            cy.location('pathname').should('eq', '/dashboard')
            cy.reload()
            cy.location('pathname').should('eq', '/dashboard')
            cy.visit('/dashboard/orders')
            cy.location('pathname').should('eq', '/dashboard/orders')
        })
    })

    it('redirecciona al login al entrar al dashboard sin sesión', () => {
        cy.clearCookies()
        cy.visit('/dashboard')
        cy.location('pathname').should('eq', '/auth/login')
    })
})
