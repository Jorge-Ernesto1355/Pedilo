const uniqueSuffix = () => `${Date.now()}${Cypress._.random(100, 999)}`

describe('Auth · acceso condicionado a negocio', () => {
    it('registra e inicia sesión, bloquea el dashboard sin negocio y lo habilita al crearlo sin recargar', () => {
        const suffix = uniqueSuffix()
        const email = `cypress-onboarding-${suffix}@example.test`
        const password = 'Strong-pass-123'
        const businessName = `Negocio ${suffix}`

        cy.visit('/auth/register')
        cy.get('[data-testid="register-name"]').type('Cypress Onboarding Owner')
        cy.get('[data-testid="register-email"]').type(email)
        cy.get('[data-testid="register-password"]').type(password)
        cy.get('[data-testid="register-confirm-password"]').type(password)
        cy.get('[data-testid="register-terms"]').check()
        cy.get('[data-testid="register-submit"]').click()

        cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
        cy.get('[data-testid="login-email"]').type(email)
        cy.get('[data-testid="login-password"]').type(password)
        cy.get('[data-testid="login-submit"]').click()
        cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')

        // Una sesión autenticada sin negocio debe conservar el perfil predeterminado.
        cy.get('button[aria-label="Abrir menú de Tu negocio"]')
            .should('be.visible')
            .and('contain', 'Tu negocio')
        cy.get('button[aria-label="Abrir menú de Tu negocio"] span[aria-hidden="true"]')
            .should('be.visible')
            .and('contain', 'TN')

        // Intentar entrar al editor de menú sin negocio no debe habilitar el catálogo.
        cy.visit('/create-menu')
        cy.contains('h1', 'Cuéntanos sobre tu negocio.').should('be.visible')
        cy.contains('button', 'Agregar categoría').should('not.exist')
        cy.contains('button', 'Agregar producto').should('not.exist')
        cy.get('a[href="/dashboard"]').should('be.visible')

        // El dashboard requiere negocio y devuelve al flujo de configuración sin crear uno.
        cy.visit('/dashboard')
        cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
        cy.location('search').should('include', 'notice=business-required')
        cy.contains('h1', 'Cuéntanos sobre tu negocio.').should('be.visible')

        cy.intercept('GET', 'https://nominatim.openstreetmap.org/search**', { body: [] })
        cy.intercept('POST', '**/api/v1/businesses').as('createBusiness')
        cy.get('#businessName').clear().type(businessName)
        cy.get('#slug').clear().type(`negocio-${suffix}`)
        cy.get('#location').clear().type('Culiacán, Sinaloa')
        cy.get('#description').clear().type('Negocio creado durante la prueba de onboarding.')
        cy.get('#open-time').clear().type('10:00')
        cy.get('#close-time').clear().type('20:00')
        cy.contains('button', 'Guardar cambios').click()

        cy.wait('@createBusiness').its('response.statusCode').should('be.oneOf', [200, 201])
        cy.contains('Cambios guardados', { timeout: 15_000 }).should('be.visible')

        // El navbar debe reflejar el negocio en el estado actual, sin reload.
        cy.get(`button[aria-label="Abrir menú de ${businessName}"]`, { timeout: 15_000 })
            .should('be.visible')
            .and('contain', businessName)
        cy.get(
            `button[aria-label="Abrir menú de ${businessName}"] span[aria-hidden="true"]`,
        ).should('contain', 'N')

        // La navegación al dashboard funciona con el estado actualizado, sin recargar la página.
        cy.contains('nav[aria-label="Navegación principal"] a', 'Resumen').click()
        cy.location('pathname', { timeout: 15_000 }).should('eq', '/dashboard')
        cy.get('[aria-label="Resumen del negocio"]', { timeout: 15_000 }).should('be.visible')
    })
})

export {}
