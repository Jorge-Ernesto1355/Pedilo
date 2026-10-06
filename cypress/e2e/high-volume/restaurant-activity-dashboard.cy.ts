type ProductSeed = { name: string; price: number }
type OrderSeed = { product: ProductSeed; quantity: number; customer: string; phone: string }

const logo = 'public/logoPediloSinfondo.png'
const cover = 'app/home/components/Gemini_Generated_Image_4tokpo4tokpo4tok-2.jpg'
const menus = [
    { name: 'Desayunos', category: 'Huevos y desayunos' },
    { name: 'Comidas', category: 'Platos fuertes' },
    { name: 'Cenas', category: 'Tacos y cenas' },
    { name: 'Promociones', category: 'Combos y extras' },
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
    { name: 'Tacos de asada', price: 95 },
    { name: 'Tacos al pastor', price: 90 },
    { name: 'Taco gobernador', price: 130 },
    { name: 'Tostada de ceviche', price: 80 },
    { name: 'Agua fresca', price: 35 },
    { name: 'Combo clásico', price: 150 },
    { name: 'Combo familiar', price: 290 },
    { name: 'Refresco', price: 30 },
    { name: 'Pay de queso', price: 60 },
    { name: 'Brownie con helado', price: 85 },
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
    cy.get('[data-testid="register-terms"]').check()
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

    cy.get('[role="dialog"]')
        .should('be.visible')
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
    cy.contains('button', 'Configurar negocio').click()
    cy.get('#settings-whatsapp').should('be.visible').clear().type('6981119319')
    cy.get('[role="dialog"]').contains('button', 'Guardar cambios').click()
    cy.get('[role="dialog"]').should('not.exist')
}

function placeOrder(slug: string, seed: OrderSeed, index: number) {
    cy.visit(`/menu/${slug}`)
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
        .find(`button[aria-label="Agregar ${seed.product.name} al carrito"]`)
        .click()
    for (let unit = 1; unit < seed.quantity; unit += 1) {
        cy.contains('article', seed.product.name)
            .find(`button[aria-label="Agregar ${seed.product.name} al carrito"]`)
            .click()
    }
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type(seed.customer)
    cy.get('#customer-phone').type(seed.phone)
    cy.get('#order-notes').type(`Pedido masivo ${index + 1}`)
    cy.contains('button', 'Confirmar pedido').click()
    cy.wait('@createHighVolumeOrder').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
        .should('be.visible')
        .and('contain', '¡Pedido enviado!')
    cy.get('button[aria-label="Cerrar confirmación"]').click()
}

describe('High volume · restaurante con actividad real y métricas', () => {
    it('genera 30 pedidos y comprueba consistencia entre órdenes, ventas y dashboard', function () {
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

            cy.visit(`/menu/${slug}`)
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

            for (let index = 0; index < 30; index += 1) {
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

            cy.intercept('GET', '**/businesses/*/orders*').as('getHighVolumeOrders')
            cy.visit('/dashboard/orders')
            cy.wait('@getHighVolumeOrders').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.total).to.be.at.least(30)
            })
            cy.contains('Pedidos').should('be.visible')
            cy.get('article').should('have.length.at.least', 1)
            cy.contains('button', 'Siguiente').should('be.visible').click()
            cy.wait('@getHighVolumeOrders')
            cy.get('article').should('have.length.at.least', 1)

            // Process 26 orders to READY, leave one PREPARING and three PENDING.
            cy.visit('/dashboard/orders')
            cy.wait('@getHighVolumeOrders')
            createdOrders.slice(0, 26).forEach((order) => {
                cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
                    .clear()
                    .type(order.customer)
                cy.wait('@getHighVolumeOrders')
                cy.contains('article', order.customer)
                    .should('be.visible')
                    .contains('button', 'Empezar a preparar')
                    .click()
                cy.wait('@highVolumeStatus')
                    .its('response.statusCode')
                    .should('be.oneOf', [200, 204])
                cy.wait('@getHighVolumeOrders')
                cy.contains('article', order.customer).contains('Preparando', { timeout: 15_000 })
                cy.contains('article', order.customer)
                    .contains('button', 'Marcar como lista')
                    .click()
                cy.wait('@highVolumeStatus')
                    .its('response.statusCode')
                    .should('be.oneOf', [200, 204])
                cy.wait('@getHighVolumeOrders')
                cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').clear()
            })
            const preparingOrder = createdOrders[26]
            cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
                .clear()
                .type(preparingOrder.customer)
            cy.wait('@getHighVolumeOrders')
            cy.contains('article', preparingOrder.customer)
                .should('be.visible')
                .contains('button', 'Empezar a preparar')
                .click()
            cy.wait('@highVolumeStatus').its('response.statusCode').should('be.oneOf', [200, 204])
            cy.wait('@getHighVolumeOrders')
            cy.get('article').contains('Preparando').should('be.visible')

            const readyOrders = createdOrders.slice(0, 26)
            const expectedReadyGross = readyOrders.reduce(
                (total, order) => total + order.product.price * order.quantity,
                0,
            )
            const expectedReadyAverage = expectedReadyGross / readyOrders.length

            cy.visit('/dashboard')
            cy.contains('Cómo te fue').should('be.visible')
            cy.contains('Cómo va tu negocio').should('be.visible')
            cy.contains('Lo más vendido').should('be.visible')
            cy.contains('Pedidos recientes').should('be.visible')
            cy.get('[aria-label="Periodo de ventas"] button').each(($button) => {
                cy.wrap($button).click()
                cy.get('[aria-label="Resumen del negocio"]').should('be.visible')
            })

            cy.intercept('GET', '**/dashboard/sales*').as('getHighVolumeSales')
            cy.visit('/dashboard/sales')
            cy.wait('@getHighVolumeSales').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.ordersCount).to.eq(readyOrders.length)
                expect(response?.body.total).to.eq(expectedReadyGross)
                expect(response?.body.averageTicket).to.eq(Math.round(expectedReadyAverage))
            })
            cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
            cy.get('[aria-label^="Gráfica de ventas"]').should('be.visible')
            cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
            cy.get('[aria-label="Periodo de ventas"] button').each(($button) => {
                cy.wrap($button).click()
                cy.get('[aria-busy="true"], [aria-busy="false"]').should('exist')
            })

            cy.log(`Pedidos creados: ${createdOrders.length}`)
            cy.log(`Pedidos READY: ${readyOrders.length}`)
            cy.log(`Ventas READY esperadas: $${expectedReadyGross.toFixed(2)}`)
            cy.log(`Ticket promedio esperado: $${expectedReadyAverage.toFixed(2)}`)
            cy.then(() => expect(errors, 'errores de consola').to.deep.equal([]))
        })
    })
})

export {}
