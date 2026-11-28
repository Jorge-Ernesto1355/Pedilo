import {
    configureWhatsapp,
    createBusiness,
    createMenuAndCategory,
    createProduct,
    logout,
    registerAndLogin,
    uniqueSuffix,
    watchRealBackendRequests,
} from '../../support/realBackendFlow'

function createCatalog() {
    createMenuAndCategory({ menu: 'Menú principal', category: 'Platillos' })
    createProduct({
        name: 'Hamburguesa Cypress',
        description: 'Carne, queso y vegetales.',
        price: 149,
    })
    cy.contains('$149.00').should('be.visible')
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

            watchRealBackendRequests()

            // Usuario nuevo → crear cuenta → logout → login.
            registerAndLogin(credentials)
            logout()
            cy.get('[data-testid="login-email"]').type(credentials.email)
            cy.get('[data-testid="login-password"]').type(credentials.password)
            cy.get('[data-testid="login-submit"]').click()
            cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')

            // Crear restaurante → menú → categoría → producto.
            createBusiness(slug)
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
                .and('contain', '¡Tu pedido está listo!')

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
                'Pendiente',
            )
            cy.then(() => {
                cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
                    .clear()
                    .type('Cliente Cypress')
                    .should('have.value', 'Cliente Cypress')
            })
            cy.wait('@searchOrders').then(({ request, response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(new URL(request.url).searchParams.get('search')).to.eq(
                    'Cliente Cypress',
                )
            })
            cy.contains('article', 'Cliente Cypress')
                .should('have.length', 1)
                .and('contain', 'Cliente Cypress')

            // Pendiente → En preparación → Lista
            cy.get('article').contains('button', 'Preparar').click()
            cy.wait('@updateOrderStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.get('article').contains('En preparación', { timeout: 15_000 }).should('be.visible')
            cy.get('article').contains('button', 'Marcar listo').click()
            cy.wait('@updateOrderStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.get('article').contains('Lista', { timeout: 15_000 }).should('be.visible')

            // Abrir detalle → verificar historial y timestamps.
            cy.get('article').find('button').first().click()
            cy.get('[role="dialog"][aria-labelledby="order-detail-title"]', { timeout: 15_000 })
                .should('be.visible')
                .within(() => {
                    cy.contains('Cliente Cypress').should('be.visible')
                    cy.contains('Hamburguesa Cypress').should('be.visible')
                    cy.contains('1 × Hamburguesa Cypress').should('be.visible')
                    cy.contains('$149.00').should('be.visible')
                    cy.contains('Pedido de prueba completa').should('be.visible')
                    cy.contains('Lista').should('be.visible')
                    cy.contains('Historial de la orden').should('be.visible')
                    cy.contains('Pendiente').should('be.visible')
                    cy.contains('En preparación').should('be.visible')
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
