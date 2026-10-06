type Credentials = { email: string; password: string }

function uniqueSuffix() {
    return `${Date.now()}${Cypress._.random(100, 999)}`
}

function registerAndLogin(credentials: Credentials) {
    cy.visit('/auth/register')
    cy.get('[data-testid="register-name"]').type('Cypress Full Flow User')
    cy.get('[data-testid="register-email"]').type(credentials.email)
    cy.get('[data-testid="register-password"]').type(credentials.password)
    cy.get('[data-testid="register-confirm-password"]').type(credentials.password)
    cy.get('[data-testid="register-terms"]').check()
    cy.get('[data-testid="register-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')

    cy.get('[data-testid="login-email"]').type(credentials.email)
    cy.get('[data-testid="login-password"]').type(credentials.password)
    cy.get('[data-testid="login-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
}

function logout() {
    cy.get('button[aria-label^="Abrir menú de "]').click()
    cy.get('[role="menu"] [role="menuitem"]').contains('Cerrar sesión').click()
    cy.wait('@logout').its('response.statusCode').should('be.oneOf', [200, 204])
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
}

function createBusiness(slug: string) {
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
    cy.contains('Cambios guardados', { timeout: 15_000 }).should('be.visible')
}

function createCatalog() {
    cy.contains('button', 'Crear menú').should('be.visible').click()
    cy.get('#menu-name')
        .should('be.visible')
        .parents('[role="dialog"]')
        .within(() => {
            cy.get('#menu-name').type('Menú principal')
            cy.get('#menu-description').type('Los favoritos de la casa.')
            cy.contains('button', 'Crear menú').click()
        })
    cy.wait('@createMenu').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('button', 'Menú principal').should('be.visible').click()

    cy.contains('button', 'Agregar').should('be.visible').click()
    cy.get('input[placeholder="Nombre de categoría"]').should('be.visible').type('Platillos')
    cy.get('textarea[placeholder="Descripción (opcional)"]')
        .should('be.visible')
        .type('Hecho al momento.')
    cy.contains('button', 'Guardar categoría').click()
    cy.wait('@createCategory').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('Platillos').should('be.visible')

    cy.contains('button', 'Agregar producto').should('be.visible').click()
    cy.get('#product-name')
        .should('be.visible')
        .parents('[role="dialog"]')
        .within(() => {
            cy.get('#product-name').type('Hamburguesa Cypress')
            cy.get('#product-description').type('Carne, queso y vegetales.')
            cy.get('#product-price').type('149')
            cy.get('#product-image').selectFile('public/logoPediloSinfondo.png', { force: true })
            cy.contains('button', 'Crear producto').click()
        })
    cy.wait('@createProduct').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('Hamburguesa Cypress').should('be.visible')
    cy.contains('$149.00').should('be.visible')
}

function configureWhatsapp() {
    cy.intercept('**/api/v1/businesses/settings', (request) => {
        if (request.method === 'POST' || request.method === 'PATCH') {
            request.alias = 'saveBusinessSettings'
        }
        request.continue()
    })
    cy.contains('button', 'Configurar negocio').should('be.visible').click()
    cy.get('#settings-whatsapp').should('be.visible').clear().type('6981119319')
    cy.get('[role="dialog"]').contains('button', 'Guardar cambios').click()
    cy.wait('@saveBusinessSettings').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.get('[role="dialog"]').should('not.exist')
}

describe('Flujo completo · usuario nuevo hasta orden lista', () => {
    it('crea cuenta, restaurante, catálogo y completa el ciclo de una orden', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }

            const suffix = uniqueSuffix()
            const email = testRegisterEmail
                ? testRegisterEmail.replace('@', `+full-flow-${suffix}@`)
                : `cypress-full-flow-${suffix}@example.test`
            const credentials = { email, password: testRegisterPassword }
            // El slug también tiene límite de 30 caracteres; el sufijo ya garantiza unicidad.
            const slug = `cx-${suffix}`

            cy.intercept('POST', '**/api/v1/businesses').as('createBusiness')
            cy.intercept('POST', '**/api/v1/businesses/*/menus').as('createMenu')
            cy.intercept('POST', '**/api/v1/businesses/*/categories').as('createCategory')
            cy.intercept('POST', '**/api/v1/businesses/*/products').as('createProduct')
            cy.intercept('POST', '**/businesses/*/orders').as('createOrder')
            cy.intercept('PATCH', '**/businesses/orders/*/status').as('updateOrderStatus')
            cy.intercept('POST', '**/api/v1/auth/logout').as('logout')

            // Usuario nuevo → crear cuenta → logout → login.
            registerAndLogin(credentials)
            logout()
            cy.get('[data-testid="login-email"]').type(credentials.email)
            cy.get('[data-testid="login-password"]').type(credentials.password)
            cy.get('[data-testid="login-submit"]').click()
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')

            // Crear restaurante → menú → categoría → producto.
            createBusiness(slug)
            cy.wait('@createBusiness').its('response.statusCode').should('be.oneOf', [200, 201])
            createCatalog()
            configureWhatsapp()

            // Abrir catálogo público → agregar producto → crear pedido como cliente.
            cy.visit(`/${slug}`)
            cy.contains('Hamburguesa Cypress', { timeout: 15_000 }).should('be.visible')
            cy.window().then((window) => {
                cy.stub(window, 'open').returns({
                    document: { title: '', body: { innerHTML: '' } },
                    location: { href: '' },
                    close: () => undefined,
                })
            })
            cy.contains('button', 'Agregar al carrito').click()
            cy.contains('button', 'Ver mi pedido').click()
            cy.get('#customer-name').type('Cliente Cypress')
            cy.get('#customer-phone').type('669-555-0142')
            cy.get('#order-notes').type('Pedido de prueba completa')
            cy.contains('button', 'Confirmar pedido').click()
            cy.wait('@createOrder').its('response.statusCode').should('be.oneOf', [200, 201])
            cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
                .should('be.visible')
                .and('contain', '¡Pedido enviado!')

            // Volver al dashboard → verificar → buscar la nueva orden.
            cy.intercept('GET', '**/businesses/*/orders*', (request) => {
                const search = new URL(request.url).searchParams.get('search')
                request.alias = search ? 'searchOrders' : 'listOrders'
                request.continue()
            })
            cy.visit('/dashboard/orders')
            cy.wait('@listOrders').its('response.statusCode').should('eq', 200)
            cy.contains('article', 'Cliente Cypress', { timeout: 15_000 }).should(
                'contain',
                'Nueva',
            )
            cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
                .clear()
                .type('1')
                .should('have.value', '1')
            cy.wait('@searchOrders').then(({ request, response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(new URL(request.url).searchParams.get('search')).to.eq('1')
            })
            cy.contains('article', 'Pedido #1')
                .should('have.length', 1)
                .and('contain', 'Cliente Cypress')

            // Nueva → Preparando → ¡Lista!
            cy.get('article').contains('button', 'Empezar a preparar').click()
            cy.wait('@updateOrderStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.get('article').contains('Preparando', { timeout: 15_000 }).should('be.visible')
            cy.get('article').contains('button', 'Marcar como lista').click()
            cy.wait('@updateOrderStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.get('article').contains('¡Lista!', { timeout: 15_000 }).should('be.visible')

            // Abrir detalle → verificar historial y timestamps.
            cy.get('article').find('button').first().click()
            cy.get('[role="dialog"][aria-labelledby="order-detail-title"]', { timeout: 15_000 })
                .should('be.visible')
                .within(() => {
                    cy.contains('Cliente Cypress').should('be.visible')
                    cy.contains('Hamburguesa Cypress').should('be.visible')
                    cy.contains('¡Lista!').should('be.visible')
                    cy.contains('Historial de la orden').should('be.visible')
                    cy.contains('Nueva').should('be.visible')
                    cy.contains('Preparando').should('be.visible')
                    cy.get('time').should('have.length.at.least', 3)
                    cy.get('time').each(($time) => {
                        expect($time.attr('dateTime')).to.match(/^\d{4}-\d{2}-\d{2}T/)
                        expect($time.text().trim()).to.match(/\d{1,2}:\d{2}/)
                    })
                })
        })
    })
})

export {}
