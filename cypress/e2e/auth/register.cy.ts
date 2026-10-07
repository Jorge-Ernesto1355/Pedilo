describe('Auth · Register', () => {
    beforeEach(() => cy.visit('/auth/register'))

    function fillRegistration(email = `cypress-${Date.now()}@example.test`) {
        cy.get('[data-testid="register-name"]').type('Cypress Test User')
        cy.get('[data-testid="register-email"]').type(email)
        cy.get('[data-testid="register-password"]').type('Strong-pass-123')
        cy.get('[data-testid="register-confirm-password"]').type('Strong-pass-123')
        cy.get('[data-testid="register-terms"]').check()
    }

    it('renderiza nombre, email, passwords y términos', () => {
        cy.get('[data-testid="register-name"]').should('be.visible')
        cy.get('[data-testid="register-email"]').should('be.visible')
        cy.get('[data-testid="register-password"]').should('be.visible')
        cy.get('[data-testid="register-confirm-password"]').should('be.visible')
        cy.get('[data-testid="register-submit"]').should('be.visible')
    })

    it('valida campos y reglas reales antes de enviar', () => {
        let registerCalls = 0
        cy.intercept('POST', '**/api/v1/auth/register', (request) => {
            registerCalls += 1
            request.continue()
        }).as('register')
        cy.get('[data-testid="register-submit"]').click()
        cy.get('p').filter(':visible').should('have.length.at.least', 4)
        cy.then(() => expect(registerCalls).to.eq(0))

        fillRegistration('not-an-email')
        cy.get('[data-testid="register-submit"]').click()
        cy.contains('Ingresa un correo válido.').should('be.visible')
        cy.then(() => expect(registerCalls).to.eq(0))
    })

    it('rechaza password corta y confirmación diferente', () => {
        cy.get('[data-testid="register-name"]').type('Cypress Test User')
        cy.get('[data-testid="register-email"]').type('valid@example.test')
        cy.get('[data-testid="register-password"]').type('short')
        cy.get('[data-testid="register-confirm-password"]').type('different')
        cy.get('[data-testid="register-terms"]').check()
        cy.get('[data-testid="register-submit"]').click()
        cy.get('p').filter(':visible').should('have.length.at.least', 1)
    })

    it('verifica payload y manejo de email duplicado con intercept', () => {
        cy.intercept('POST', '**/api/v1/auth/register', (request) => {
            expect(request.body).to.deep.equal({
                name: 'Cypress Test User',
                email: 'registered@example.test',
                password: 'Strong-pass-123',
                terms: true,
            })
            request.reply({
                statusCode: 409,
                body: {
                    error: {
                        code: 'EMAIL_ALREADY_IN_USE',
                        message: 'Este correo ya tiene una cuenta. inicia sesión para continuar',
                    },
                },
            })
        }).as('register')
        fillRegistration('registered@example.test')
        cy.get('[data-testid="register-submit"]').click()
        cy.wait('@register').its('request.method').should('eq', 'POST')
        cy.get('[role="alert"]').should(
            'contain',
            'Este correo ya tiene una cuenta. Inicia sesión para continuar.',
        )
    })

    it('después de registrarse solo navega al login y no consulta datos privados', () => {
        let privateRequests = 0

        cy.intercept('GET', '**/api/v1/businesses/mine', (request) => {
            privateRequests += 1
            request.continue()
        })
        cy.intercept('POST', '**/api/v1/auth/register', {
            statusCode: 201,
            body: { success: true },
        }).as('register')

        fillRegistration('isolated-signup@example.test')
        cy.get('[data-testid="register-submit"]').click()
        cy.wait('@register')

        cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
        cy.get('[data-testid="login-email"]').should('be.visible')
        cy.then(() => expect(privateRequests).to.eq(0))
    })

    it('mantiene el login visible si había otra sesión activa', function () {
        cy.env(['testUserEmail', 'testUserPassword']).then(function ({
            testUserEmail,
            testUserPassword,
        }) {
            if (!testUserEmail || !testUserPassword) {
                this.skip()
                return
            }

            cy.login({ email: testUserEmail, password: testUserPassword })

            let privateRequests = 0
            cy.intercept('GET', '**/api/v1/businesses/mine', (request) => {
                privateRequests += 1
                request.continue()
            })
            cy.intercept('POST', '**/api/v1/auth/register', {
                statusCode: 201,
                body: { success: true },
            }).as('registerWithExistingSession')

            cy.visit('/auth/register')
            fillRegistration('isolated-signup-with-session@example.test')
            cy.get('[data-testid="register-submit"]').click()
            cy.wait('@registerWithExistingSession')

            cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
            cy.get('[data-testid="login-email"]').should('be.visible')
            cy.then(() => expect(privateRequests).to.eq(0))
        })
    })

    it('no duplica la petición durante loading', () => {
        let registerCalls = 0
        cy.intercept('POST', '**/api/v1/auth/register', (request) => {
            registerCalls += 1
            request.reply({ delay: 1000, statusCode: 201, body: { success: true } })
        }).as('register')
        fillRegistration()
        cy.get('[data-testid="register-submit"]').click()
        cy.get('[data-testid="register-submit"]')
            .should('be.disabled')
            .and('have.attr', 'aria-busy', 'true')
        cy.get('[data-testid="register-submit"]').click({ force: true })
        cy.then(() => expect(registerCalls).to.eq(1))
        cy.wait('@register')
    })

    it('registra un usuario real con email único cuando hay credenciales configuradas', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }
            const uniqueSuffix = `cypress-${Date.now()}`
            const email = testRegisterEmail
                ? testRegisterEmail.replace('@', `+${uniqueSuffix}@`)
                : `${uniqueSuffix}@example.test`
            fillRegistration(email)
            cy.get('[data-testid="register-submit"]').click()
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
        })
    })
})
