const uniqueSuffix = () => `${Date.now()}${Cypress._.random(100, 999)}`

function diagnosticCredentials() {
    const env = Cypress.config('env') as {
        diagnosticEmail?: string
        diagnosticPassword?: string
    }
    const email = env.diagnosticEmail
    const password = env.diagnosticPassword

    if (!email || !password) {
        throw new Error(
            'Configura CYPRESS_TEST_EMAIL y CYPRESS_TEST_PASSWORD para ejecutar el diagnóstico de onboarding.',
        )
    }

    return { email, password }
}

function assertResponse(alias: `@${string}`, expected: number[]) {
    return cy.wait(alias).then((interception) => {
        expect(interception.request.method).to.be.oneOf(['POST', 'GET', 'PATCH'])
        expect(Boolean(interception.response), `La request ${alias} no recibió respuesta`).to.equal(
            true,
        )
        expect(interception.response?.statusCode, `Status de ${alias}`).to.be.oneOf(expected)
        cy.log(`${alias}: ${interception.response?.statusCode}`)
        return interception
    })
}

describe('Diagnóstico real · creación de negocio', () => {
    it('registra, crea un negocio y conserva el estado sin recargar', function () {
        let credentials: ReturnType<typeof diagnosticCredentials>
        try {
            credentials = diagnosticCredentials()
        } catch (error) {
            cy.log(error instanceof Error ? error.message : String(error))
            this.skip()
            return
        }

        const suffix = uniqueSuffix()
        const email = credentials.email.replace('@', `-cypress-${suffix}@`)
        const password = credentials.password
        const businessName = `Cypress diagnóstico ${suffix}`
        const slug = `cypress-${suffix}`.slice(0, 30)

        cy.intercept('POST', '**/api/v1/auth/register').as('register')
        cy.intercept('POST', '**/api/auth/login').as('login')
        cy.intercept('GET', '**/api/v1/businesses/mine').as('getBusinessBeforeOrAfter')
        cy.intercept('POST', '**/api/v1/businesses').as('createBusiness')

        cy.visit('/auth/register')
        cy.get('[data-testid="register-name"]').type('Cypress Diagnóstico')
        cy.get('[data-testid="register-email"]').type(email)
        cy.get('[data-testid="register-password"]').type(password)
        cy.get('[data-testid="register-confirm-password"]').type(password)
        cy.get('[data-testid="register-terms"]').check()
        cy.get('[data-testid="register-submit"]').click()
        cy.location('pathname', { timeout: 20_000 }).should('eq', '/auth/login')
        assertResponse('@register', [200, 201])

        cy.get('[data-testid="login-email"]').type(email)
        cy.get('[data-testid="login-password"]').type(password)
        cy.get('[data-testid="login-submit"]').click()
        assertResponse('@login', [200, 201])
        cy.location('pathname', { timeout: 20_000 }).should('eq', '/create-menu')

        cy.get('#businessName').should('be.visible').clear().type(businessName)
        cy.get('#slug').clear().type(slug)
        cy.get('#location').clear().type('Mazatlán, Sinaloa')
        cy.get('#description').clear().type('Negocio creado para diagnóstico E2E.')
        cy.get('#open-time').clear().type('09:00')
        cy.get('#close-time').clear().type('21:00')
        cy.get('form button[type="submit"]')
            .click()
            .should('be.disabled')
            .and('have.attr', 'aria-busy', 'true')
            .and('contain', 'Creando negocio')

        assertResponse('@createBusiness', [200, 201]).then((interception) => {
            expect(interception.response?.body, 'Respuesta de creación').to.not.equal(undefined)
        })
        cy.contains('Negocio creado', { timeout: 20_000 }).should('be.visible')
        cy.get(`button[aria-label="Abrir menú de ${businessName}"]`, { timeout: 20_000 })
            .should('be.visible')
            .and('contain', businessName)

        cy.contains('nav[aria-label="Navegación principal"] a', 'Resumen').click()
        cy.location('pathname', { timeout: 20_000 }).should('eq', '/dashboard')
        cy.get('[aria-label="Resumen del negocio"]', { timeout: 20_000 }).should('be.visible')

        cy.reload()
        cy.location('pathname', { timeout: 20_000 }).should('eq', '/dashboard')
        cy.get(`button[aria-label="Abrir menú de ${businessName}"]`, { timeout: 20_000 })
            .should('be.visible')
            .and('contain', businessName)
    })
})
