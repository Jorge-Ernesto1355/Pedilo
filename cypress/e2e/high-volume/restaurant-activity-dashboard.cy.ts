import { visitViaClientNavigation } from '../../support/clientNavigation'
import { revealDashboardModules } from '../../support/deferredModules'
// Las cifras de "Hoy" llegan del servidor en una carga completa; para inspeccionar la
// respuesta del backend se entra a la página por navegación interna.

type ProductSeed = { name: string; price: number }
type OrderSeed = { product: ProductSeed; quantity: number; customer: string; phone: string }

const logo = 'public/logoPediloSinfondo.png'
const cover = 'app/home/components/Gemini_Generated_Image_4tokpo4tokpo4tok-2.jpg'
const menus = [
    { name: 'Desayunos', category: 'Huevos y desayunos' },
    { name: 'Comidas', category: 'Platos fuertes' },
]
const products: ProductSeed[] = [
    { name: 'Huevos rancheros', price: 85 },
    { name: 'Chilaquiles verdes', price: 95 },
    { name: 'Omelette especial', price: 110 },
    { name: 'Hot cakes de la casa', price: 75 },
    { name: 'Café de olla', price: 35 },
    { name: 'Hamburguesa clásica', price: 120 },
    { name: 'Hamburguesa doble', price: 145 },
    { name: 'Burrito norteño', price: 110 },
    { name: 'Quesadilla grande', price: 75 },
    { name: 'Papas sazonadas', price: 55 },
]

function suffix() {
    return `${Date.now()}${Cypress._.random(100, 999)}`
}

function registerAndLogin(email: string, testPassword: string) {
    cy.visit('/auth/register')
    cy.get('[data-testid="register-name"]').type('Cypress Restaurant Activity')
    cy.get('[data-testid="register-email"]').type(email)
    cy.get('[data-testid="register-password"]').type(testPassword)
    cy.get('[data-testid="register-confirm-password"]').type(testPassword)
    cy.get('[data-testid="register-legal"]').check()
    cy.get('[data-testid="register-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
    cy.get('[data-testid="login-email"]').type(email)
    cy.get('[data-testid="login-password"]').type(testPassword)
    cy.get('[data-testid="login-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
}

function createBusiness(slug: string) {
    cy.get('#businessName').clear().type('Actividad Cypress')
    cy.get('#slug').clear().type(slug)
    cy.get('#location').clear().type('Mazatlán, Sinaloa')
    cy.get('#description').clear().type('Restaurante con actividad para validar métricas reales.')
    cy.get('#open-time').clear().type('08:00')
    cy.get('#close-time').clear().type('23:00')
    cy.get('#business-logo').selectFile(logo, { force: true })
    cy.get('#business-cover').selectFile(cover, { force: true })
    cy.contains('button', 'Guardar cambios').click()
    cy.contains('Cambios guardados', { timeout: 15_000 }).should('be.visible')
}

function createMenuWithCategory(menuName: string, categoryName: string) {
    cy.contains('button', 'Crear menú').should('be.visible').click()
    cy.get('#menu-name').should('be.visible').type(menuName)
    cy.get('#menu-description').type(`${menuName} para clientes del restaurante.`)
    cy.get('input[placeholder="Nombre de categoría"]').type(categoryName)
    cy.get('textarea[placeholder="Descripción de categoría (opcional)"]').type(
        `Categoría de ${menuName}.`,
    )
    cy.get('button[aria-label="Agregar categoría"]').click()
    cy.get('[role="dialog"]').contains('button', 'Crear menú').click()
    cy.wait('@createHighVolumeMenu').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('button', menuName, { timeout: 15_000 }).should('be.visible').click()
    cy.contains(categoryName, { timeout: 15_000 }).should('be.visible')
}

function createProduct(categoryName: string, product: ProductSeed, withImage = false) {
    cy.get(`[aria-label="Reordenar categoría ${categoryName}"]`)
        .should('be.visible')
        .within(() => {
            cy.contains('button', 'Agregar producto').click()
        })
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Continuar con producto').click()

    cy.get('[role="dialog"]')
        .filter(':has(#product-name)')
        .should('have.length', 1)
        .and('be.visible')
        .within(() => {
            cy.get('#product-name').should('be.visible').clear().type(product.name)
            cy.get('#product-description').clear().type(`${product.name} preparado al momento.`)
            cy.get('#product-price').clear().type(String(product.price))
            cy.get('#product-name').should('have.value', product.name)
            cy.get('#product-price').should('have.value', String(product.price))
            if (withImage) cy.get('#product-image').selectFile(logo, { force: true })
            cy.contains('button[type="submit"]', 'Crear producto')
                .should('be.visible')
                .and('not.be.disabled')
                .click()
        })
    cy.wait('@createHighVolumeProduct').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains(product.name, { timeout: 15_000 }).should('be.visible')
}

function configureWhatsapp() {
    cy.intercept('PATCH', '**/api/v1/businesses/settings').as('saveWhatsapp')
    cy.get('#whatsapp-card').should('be.visible')
    cy.contains('button', 'Configurar WhatsApp').click()
    cy.get('#business-whatsapp', { timeout: 15_000 }).should('be.visible').clear().type('6981119319')
    cy.contains('button', 'Guardar número').click()
    cy.wait('@saveWhatsapp').its('response.statusCode').should('eq', 200)
    cy.contains('Número guardado correctamente.').should('be.visible')
    cy.get('#business-whatsapp').should('have.value', '+52 698 111 9319')
}

// El skeleton de /orders trae un input de búsqueda deshabilitado; se espera al real.
function searchOrdersInput() {
    return cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').should('not.be.disabled')
}

function placeOrder(slug: string, seed: OrderSeed, index: number) {
    cy.visit(`/${slug}`)
    cy.window().then((window) => {
        cy.stub(window, 'open').returns({
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        })
    })
    const productIndex = products.findIndex((product) => product.name === seed.product.name)
    const menu = menus[Math.floor(productIndex / 5)]
    cy.get('section[aria-label="Menús"]').contains('button', menu.name).click()
    cy.contains('h2', menu.category, { timeout: 15_000 }).should('be.visible')
    cy.contains('article', seed.product.name)
        .find(`button[aria-label="Agregar al carrito: ${seed.product.name}"]`)
        .click()
    for (let unit = 1; unit < seed.quantity; unit += 1) {
        cy.contains('article', seed.product.name)
            .find(`button[aria-label="Agregar al carrito: ${seed.product.name}"]`)
            .click()
    }
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type(seed.customer)
    cy.get('#customer-phone').type(seed.phone)
    cy.get('#order-notes').type(`Pedido masivo ${index + 1}`)
    cy.contains('button', 'Confirmar pedido').click()
    cy.wait('@createHighVolumeOrder').then(({ request, response }) => {
        expect(response?.statusCode, `${JSON.stringify(request.body)} -> ${JSON.stringify(response?.body)}`).to.be.oneOf([200, 201])
    })
    cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
        .should('be.visible')
        .and('contain', '¡Tu pedido está listo!')
    cy.get('button[aria-label="Cerrar confirmación"]').click()
}

describe('High volume · restaurante con actividad real y métricas', () => {
    it('genera 15 pedidos y comprueba consistencia entre órdenes, ventas y dashboard', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }

            const id = suffix()
            const email = testRegisterEmail
                ? testRegisterEmail.replace('@', `+high-volume-${id}@`)
                : `cypress-high-volume-${id}@example.test`
            const slug = `hv-${id}`
            const createdOrders: OrderSeed[] = []
            const errors: string[] = []

            cy.on('window:console', (message) => {
                if (message.type === 'error') errors.push(message.args.join(' '))
            })
            cy.intercept('POST', '**/businesses/*/orders').as('createHighVolumeOrder')
            cy.intercept('PATCH', '**/businesses/orders/*/status').as('highVolumeStatus')
            cy.intercept('POST', '**/api/v1/businesses/*/menus').as('createHighVolumeMenu')
            cy.intercept('POST', '**/api/v1/businesses/*/products').as('createHighVolumeProduct')

            registerAndLogin(email, testRegisterPassword)
            cy.visit('/create-menu')
            createBusiness(slug)
            configureWhatsapp()

            menus.forEach((menu, menuIndex) => {
                createMenuWithCategory(menu.name, menu.category)
                products.slice(menuIndex * 5, menuIndex * 5 + 5).forEach((product, index) => {
                    createProduct(menu.category, product, menuIndex === 0 && index === 0)
                })
            })

            cy.visit(`/${slug}`)
            cy.contains('h1', 'Actividad Cypress').should('be.visible')
            menus.forEach((menu, menuIndex) => {
                cy.get('section[aria-label="Menús"]').contains('button', menu.name).click()
                cy.contains('h2', menu.category, { timeout: 15_000 }).should('be.visible')
                products.slice(menuIndex * 5, menuIndex * 5 + 5).forEach((product) => {
                    cy.contains('article', product.name)
                        .should('contain', `$${product.price.toFixed(2)}`)
                        .and('be.visible')
                })
            })

            for (let index = 0; index < 15; index += 1) {
                const product = products[index % products.length]
                const order: OrderSeed = {
                    product,
                    quantity: (index % 4) + 1,
                    customer: `Cliente ${String(index + 1).padStart(2, '0')}`,
                    phone: `669555${String(index + 1000).slice(-4)}`,
                }
                createdOrders.push(order)
                placeOrder(slug, order, index)
            }

            // La página también pide contadores por estado (limit=1); solo las listas
            // (limit distinto de 1) llevan el total y los pedidos que se verifican aquí.
            cy.intercept('GET', '**/businesses/*/orders*', (request) => {
                if (new URL(request.url).searchParams.get('limit') !== '1') {
                    request.alias = 'getHighVolumeOrders'
                }
            })
            cy.visit('/dashboard/orders')
            cy.wait('@getHighVolumeOrders').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.total).to.be.at.least(15)
            })
            cy.contains('Pedidos').should('be.visible')
            cy.get('article').should('have.length.at.least', 1)
            cy.contains('button', 'Siguiente').should('be.visible').click()
            cy.wait('@getHighVolumeOrders')
            cy.get('article').should('have.length.at.least', 1)

            // Process 13 orders to READY, leave one PREPARING and one PENDING.
            cy.visit('/dashboard/orders')
            cy.wait('@getHighVolumeOrders')
            createdOrders.slice(0, 13).forEach((order) => {
                searchOrdersInput()
                    .clear()
                    .type(order.customer)
                cy.wait('@getHighVolumeOrders')
                cy.contains('article', order.customer)
                    .should('be.visible')
                    .contains('button', 'Preparar')
                    .click()
                cy.wait('@highVolumeStatus')
                    .its('response.statusCode')
                    .should('be.oneOf', [200, 204])
                cy.wait('@getHighVolumeOrders')
                cy.contains('article', order.customer).contains('En preparación', { timeout: 15_000 })
                cy.contains('article', order.customer)
                    .contains('button', 'Marcar listo')
                    .click()
                cy.wait('@highVolumeStatus')
                    .its('response.statusCode')
                    .should('be.oneOf', [200, 204])
                cy.wait('@getHighVolumeOrders')
                searchOrdersInput().clear()
            })
            const preparingOrder = createdOrders[13]
            searchOrdersInput()
                .clear()
                .type(preparingOrder.customer)
            cy.wait('@getHighVolumeOrders')
            cy.contains('article', preparingOrder.customer)
                .should('be.visible')
                .contains('button', 'Preparar')
                .click()
            cy.wait('@highVolumeStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.wait('@getHighVolumeOrders')
            cy.get('article').contains('En preparación').should('be.visible')

            // El backend cuenta como venta los pedidos PREPARING y READY (no los PENDING).
            const readyOrders = createdOrders.slice(0, 14)
            const expectedReadyGross = readyOrders.reduce(
                (total, order) => total + order.product.price * order.quantity,
                0,
            )
            const expectedReadyAverage = expectedReadyGross / readyOrders.length

            cy.visit('/dashboard')
            revealDashboardModules()
            cy.contains('Cómo te fue').should('be.visible')
            cy.contains('Lo más vendido').should('be.visible')
            cy.contains('Pedidos recientes').should('be.visible')
            ;['7d', '30d', 'thisMonth', 'today'].forEach((period) => {
                cy.get(`[aria-label="Periodo del dashboard"] button[data-value="${period}"]`).click()
                cy.get('[aria-label="Resumen del negocio"]').should('be.visible')
            })

            visitViaClientNavigation('/dashboard/sales')
            // "Hoy" llega sembrado/en caché (sin petición del navegador): las cifras se
            // verifican contra el API autenticado y se confirman en pantalla.
            cy.env(['backendUrl']).then(({ backendUrl }) => {
                cy.request(`${String(backendUrl).replace(/\/$/, '')}/api/v1/dashboard/sales?period=today`).then(({ status, body }) => {
                    expect(status).to.eq(200)
                    expect(body.ordersCount, JSON.stringify(body)).to.eq(readyOrders.length)
                    expect(body.total).to.eq(expectedReadyGross)
                })
            })
            const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            cy.contains(money(expectedReadyGross)).should('be.visible')
            cy.contains(money(expectedReadyAverage)).should('be.visible')
            cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
            cy.get('[aria-label^="Gráfica de ventas"]').should('be.visible')
            cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
            ;['7d', '30d', 'thisMonth', 'today'].forEach((period) => {
                cy.get(`[aria-label="Periodo de ventas"] button[data-value="${period}"]`).click()
                cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
            })

            cy.log(`Pedidos creados: ${createdOrders.length}`)
            cy.log(`Pedidos que cuentan como venta (PREPARING + READY): ${readyOrders.length}`)
            cy.log(`Ventas READY esperadas: $${expectedReadyGross.toFixed(2)}`)
            cy.log(`Ticket promedio esperado: $${expectedReadyAverage.toFixed(2)}`)
            cy.then(() => expect(errors, 'errores de consola').to.deep.equal([]))
        })
    })
})

export {}
