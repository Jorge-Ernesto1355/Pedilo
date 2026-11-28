// Pasos de interfaz reutilizables para las pruebas que usan el backend real (sin respuestas
// simuladas): registro, negocio, catálogo y WhatsApp. Cada helper encola comandos de Cypress.
// Los specs que los usan crean cuentas y slugs únicos, así que no chocan entre corridas.

export type Credentials = { email: string; password: string }

export function uniqueSuffix() {
    return `${Date.now()}${Cypress._.random(100, 999)}`
}

/** Alias de las peticiones reales que los helpers esperan (`@createMenu`, etc.). */
export function watchRealBackendRequests() {
    cy.intercept('POST', '**/api/v1/businesses').as('createBusiness')
    cy.intercept('POST', '**/api/v1/businesses/*/menus').as('createMenu')
    cy.intercept('POST', '**/api/v1/businesses/*/categories').as('createCategory')
    cy.intercept('POST', '**/api/v1/businesses/*/products').as('createProduct')
    cy.intercept('POST', '**/businesses/products/combos').as('createCombo')
    cy.intercept('POST', '**/businesses/*/orders').as('createOrder')
    cy.intercept('PATCH', '**/businesses/orders/*/status').as('updateOrderStatus')
    cy.intercept('POST', '/api/auth/logout').as('logout')
}

export function registerAndLogin(credentials: Credentials) {
    cy.visit('/auth/register')
    cy.get('[data-testid="register-name"]').type('Cypress Full Flow User')
    cy.get('[data-testid="register-email"]').type(credentials.email)
    cy.get('[data-testid="register-password"]').type(credentials.password)
    cy.get('[data-testid="register-confirm-password"]').type(credentials.password)
    cy.get('[data-testid="register-legal"]').check()
    cy.get('[data-testid="register-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')

    cy.get('[data-testid="login-email"]').type(credentials.email)
    cy.get('[data-testid="login-password"]').type(credentials.password)
    cy.get('[data-testid="login-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
}

export function logout() {
    cy.get('button[aria-label^="Abrir menú de "]').click()
    cy.get('[role="menu"] [role="menuitem"]').contains('Cerrar sesión').click()
    cy.wait('@logout').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
}

export function createBusiness(slug: string) {
    cy.visit('/create-menu')
    cy.contains('h1', 'Cuéntanos sobre tu negocio.').should('be.visible')
    cy.get('#businessName').clear().type('Cypress')
    cy.get('#slug').clear().type(slug)
    cy.get('#location').clear().type('Mazatlán, Sinaloa')
    cy.get('#description').clear().type('Comida casera para la prueba completa.')
    cy.get('#open-time').clear().type('09:00')
    cy.get('#close-time').clear().type('22:00')
    cy.get('#business-logo').selectFile('public/logoPediloSinfondo.png', { force: true })
    cy.get('#business-cover').selectFile(
        'app/home/components/Gemini_Generated_Image_4tokpo4tokpo4tok-2.jpg',
        { force: true },
    )
    cy.contains('button', 'Guardar cambios').click()
    cy.wait('@createBusiness').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('Cambios guardados', { timeout: 15_000 }).should('be.visible')
}

/** Crea el menú y una categoría, y deja el menú abierto para agregar productos. */
export function createMenuAndCategory(names: { menu: string; category: string }) {
    // Pausa deliberada: igual que una persona, se deja que termine de asentarse el estado
    // tras crear el negocio antes de abrir "Crear menú".
    cy.wait(3000)
    cy.contains('button', 'Crear menú').should('be.visible').click()
    cy.get('#menu-name')
        .should('be.visible')
        .parents('[role="dialog"]')
        .within(() => {
            cy.get('#menu-name').type(names.menu)
            cy.get('#menu-description').type('Los favoritos de la casa.')
            cy.contains('button', 'Crear menú').click()
        })
    cy.wait('@createMenu').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('button', names.menu).should('be.visible').click()

    cy.contains('button', 'Agregar').should('be.visible').click()
    cy.get('input[placeholder="Nombre de categoría"]').should('be.visible').type(names.category)
    cy.get('textarea[placeholder="Descripción (opcional)"]')
        .should('be.visible')
        .type('Hecho al momento.')
    cy.contains('button', 'Guardar categoría').click()
    cy.wait('@createCategory').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains(names.category).should('be.visible')
}

export function createProduct(product: { name: string; description: string; price: number }) {
    cy.contains('button', 'Agregar producto').should('be.visible').click()
    cy.get('[data-testid="product-type-dialog"]')
        .contains('button', 'Continuar con producto')
        .click()
    cy.get('#product-name')
        .should('be.visible')
        .parents('[role="dialog"]')
        .within(() => {
            cy.get('#product-name').type(product.name)
            cy.get('#product-description').type(product.description)
            cy.get('#product-price').type(String(product.price))
            cy.get('#product-image').selectFile('public/logoPediloSinfondo.png', { force: true })
            cy.contains('button', 'Crear producto').click()
        })
    cy.wait('@createProduct').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains(product.name).should('be.visible')
}

export function configureWhatsapp() {
    cy.intercept('PATCH', '**/api/v1/businesses/settings').as('saveBusinessSettings')
    // El formulario de WhatsApp vive tras la tarjeta de configuración del panel.
    cy.get('#whatsapp-card').should('be.visible')
    cy.contains('button', 'Configurar WhatsApp').click()
    cy.get('#business-whatsapp', { timeout: 15_000 })
        .should('be.visible')
        .clear()
        .type('6981119319')
    cy.contains('button', 'Guardar número').click()
    cy.wait('@saveBusinessSettings').its('response.statusCode').should('eq', 200)
    cy.contains('Número guardado correctamente.').should('be.visible')
    cy.get('#business-whatsapp').should('have.value', '+52 698 111 9319')
}

/** El pedido abre WhatsApp en una pestaña nueva: se sustituye por un doble inofensivo. */
export function stubWhatsappWindow() {
    cy.window().then((window) => {
        cy.stub(window, 'open').returns({
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        })
    })
}

/** Email único para una cuenta nueva; conserva el buzón de pruebas si hay uno configurado. */
export function newAccountEmail(prefix: string, suffix: string, baseEmail?: string) {
    return baseEmail
        ? baseEmail.replace('@', `+${prefix}-${suffix}@`)
        : `cypress-${prefix}-${suffix}@example.test`
}
