const slug = 'producto-concurrencia-e2e'
const businessId = 'business-product-concurrency-e2e'
const productId = 'product-product-concurrency-e2e'
const productName = 'Coca Cola'
const productPath = `**/api/v1/businesses/products/${productId}`

type ProductState = {
    id: string
    name: string
    description: string
    price: number
    isAvailable: boolean
}

let product: ProductState
let serverPrice = 100
let serverDescription = 'Bebida fría.'
let activeSlug = slug

function resetProduct(overrides: Partial<ProductState> = {}) {
    product = {
        id: productId,
        name: productName,
        description: 'Bebida fría.',
        price: 100,
        isAvailable: true,
        ...overrides,
    }
    serverPrice = product.price
    serverDescription = product.description
}

function catalogResponse() {
    return {
        business: {
            id: businessId,
            name: 'Negocio de concurrencia E2E',
            slug: activeSlug,
            description: 'Catálogo para probar cambios concurrentes.',
            logoUrl: null,
            logoBlurUrl: null,
            coverUrl: null,
            coverBlurUrl: null,
            ubication: 'Culiacán, Sinaloa',
            ubicationMaps: null,
            businessSchedule: null,
            whatsappNumber: '+526691234567',
        },
        menus: [
            {
                id: 'menu-product-concurrency-e2e',
                businessId,
                name: 'Menú principal',
                description: 'Productos disponibles.',
                isActive: true,
                categories: [
                    {
                        id: 'category-product-concurrency-e2e',
                        businessId,
                        menuId: 'menu-product-concurrency-e2e',
                        name: 'Bebidas',
                        description: null,
                        sortOrder: 0,
                        isActive: true,
                        products: [
                            {
                                ...product,
                                categoryId: 'category-product-concurrency-e2e',
                                businessId,
                                imageUrl: null,
                                sortOrder: 0,
                                description: serverDescription,
                                price: serverPrice,
                                optionGroups: [],
                            },
                        ],
                    },
                ],
            },
        ],
    }
}

function installCatalog() {
    cy.intercept('GET', '**/api/v1/public/businesses/*/catalog', (request) => {
        request.alias = 'getCatalog'
        request.reply({ statusCode: 200, body: catalogResponse() })
    })
}

function stubWhatsApp() {
    cy.window().then((window) => {
        cy.stub(window, 'open')
            .as('openWhatsApp')
            .returns({
                document: { title: '', body: { innerHTML: '' } },
                location: { href: '' },
                close: () => undefined,
            })
    })
}

function addProductToCart() {
    cy.contains('article', productName).contains('button', 'Agregar al carrito').click()
}

function openCheckout() {
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('[role="dialog"][aria-labelledby="order-title"]')
        .should('be.visible')
        .within(() => {
            cy.get('#customer-name').type('Cliente E2E')
            cy.get('#customer-phone').type('669-123-4567')
        })
}

function visitPublicCatalog() {
    // Cada caso empieza con el producto publicado; los cambios concurrentes
    // se aplican después de que el catálogo ya está abierto.
    serverPrice = 100
    serverDescription = 'Bebida fría.'
    activeSlug = `${slug}-${Date.now()}`
    installCatalog()
    cy.visit(`/${activeSlug}`)
    cy.wait('@getCatalog')
    stubWhatsApp()
}

function fetchFromApp(method: string, url: string, body?: unknown) {
    return cy.window().then((window) =>
        window.fetch(url, {
            method,
            credentials: 'include',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        }),
    )
}

describe('Productos · historial y cambios concurrentes', () => {
    beforeEach(() => resetProduct())

    it('impide eliminar un producto con 100 pedidos y conserva el historial', () => {
        const historicalOrders = Array.from({ length: 100 }, (_, index) => ({
            id: `order-history-${index + 1}`,
            orderNumber: index + 1,
            items: [{ productId, productName: 'Coca Cola', unitPrice: 100, quantity: 1 }],
            total: 100,
        }))

        cy.intercept('DELETE', productPath, {
            statusCode: 409,
            body: { error: { code: 'PRODUCT_HAS_ORDERS' } },
        }).as('deleteProduct')
        cy.intercept('GET', '**/api/v1/businesses/*/orders*', {
            statusCode: 200,
            body: { orders: historicalOrders, total: 100 },
        }).as('historicalOrders')

        fetchFromApp('DELETE', `/api/v1/businesses/products/${productId}`)
            .its('status')
            .should('eq', 409)
        cy.wait('@deleteProduct')
        fetchFromApp('GET', `/api/v1/businesses/${businessId}/orders?limit=100`)
            .its('status')
            .should('eq', 200)
        cy.wait('@historicalOrders')
            .its('response.body.orders')
            .then((orders) => {
                expect(orders).to.have.length(100)
                expect(orders[0].items[0]).to.deep.include({
                    productName: 'Coca Cola',
                    unitPrice: 100,
                })
            })
    })

    it('rechaza el pedido si el producto fue eliminado mientras estaba en el carrito', () => {
        visitPublicCatalog()
        addProductToCart()

        cy.intercept('DELETE', productPath, { statusCode: 204, body: null }).as('deleteProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/orders', {
            statusCode: 400,
            body: { error: { code: 'ORDER_PRODUCT_NOT_AVAILABLE' } },
        }).as('createOrder')
        fetchFromApp('DELETE', `/api/v1/businesses/products/${productId}`)
        cy.wait('@deleteProduct')

        openCheckout()
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[data-testid="order-error"]')
            .should('be.visible')
            .and('contain', 'Uno de los productos seleccionados ya no está disponible.')
    })

    it('confirma el carrito con el precio vigente de $150 después de cambiarlo desde $100', () => {
        visitPublicCatalog()
        addProductToCart()
        serverPrice = 150

        cy.intercept('POST', '**/api/v1/businesses/*/orders', (request) => {
            expect(request.body).not.to.have.property('price')
            request.reply({
                statusCode: 201,
                body: { order: { id: 'order-price-150', orderNumber: 1, total: 150 } },
            })
        }).as('createOrder')
        openCheckout()
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]').should(
            'contain',
            '¡Pedido enviado!',
        )
    })

    it('confirma el checkout con el nuevo precio si cambia mientras el cliente está confirmando', () => {
        visitPublicCatalog()
        addProductToCart()
        openCheckout()
        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .should('contain', '$100 c/u')
            .and('be.visible')

        serverPrice = 150
        cy.intercept('POST', '**/api/v1/businesses/*/orders', (request) => {
            expect(request.body).not.to.have.property('price')
            request.reply({ statusCode: 201, body: { order: { total: 150 } } })
        }).as('createOrder')
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]').should('be.visible')
    })

    it('conserva el precio original después de crear el pedido', () => {
        const createdOrder = {
            id: 'order-original-price',
            items: [{ productId, productName: 'Coca Cola', unitPrice: 100, quantity: 1 }],
            total: 100,
        }
        cy.intercept('POST', '**/api/v1/businesses/*/orders', {
            statusCode: 201,
            body: { order: createdOrder },
        }).as('createOrder')
        cy.intercept('PATCH', productPath, (request) => {
            product.price = Number(request.body.price)
            request.reply({ statusCode: 200, body: { product } })
        }).as('updateProduct')
        cy.intercept('GET', '**/api/v1/businesses/orders/order-original-price', {
            statusCode: 200,
            body: { order: createdOrder },
        }).as('getOrder')

        fetchFromApp('POST', `/api/v1/businesses/${businessId}/orders`, {
            customer: { name: 'Cliente E2E', phone: '6691234567' },
            items: [{ productId, quantity: 1, optionIds: [] }],
        })
        cy.wait('@createOrder')
        fetchFromApp('PATCH', `/api/v1/businesses/products/${productId}`, { price: 150 })
        cy.wait('@updateProduct')
        fetchFromApp('GET', '/api/v1/businesses/orders/order-original-price')
        cy.wait('@getOrder')
            .its('response.body.order')
            .should('deep.include', {
                items: [{ productId, productName: 'Coca Cola', unitPrice: 100, quantity: 1 }],
                total: 100,
            })
    })

    it('conserva el nombre vendido después de cambiar el nombre del producto', () => {
        const createdOrder = {
            id: 'order-original-name',
            items: [{ productId, productName: 'Coca Cola', unitPrice: 100, quantity: 1 }],
        }
        cy.intercept('PATCH', productPath, (request) => {
            product.name = String(request.body.name)
            request.reply({ statusCode: 200, body: { product } })
        }).as('updateProduct')
        cy.intercept('GET', '**/api/v1/businesses/orders/order-original-name', {
            statusCode: 200,
            body: { order: createdOrder },
        }).as('getOrder')

        fetchFromApp('PATCH', `/api/v1/businesses/products/${productId}`, {
            name: 'Coca Cola Zero',
        })
        cy.wait('@updateProduct')
        fetchFromApp('GET', '/api/v1/businesses/orders/order-original-name')
        cy.wait('@getOrder')
            .its('response.body.order.items[0].productName')
            .should('eq', 'Coca Cola')
    })

    it('muestra la descripción nueva en una carga posterior del catálogo', () => {
        visitPublicCatalog()
        cy.get('article').should('have.length', 1).and('contain.text', 'Bebida fría.')

        serverDescription = 'Bebida fría de 355 ml.'
        cy.intercept('PATCH', productPath, (request) => {
            serverDescription = String(request.body.description)
            request.reply({ statusCode: 200, body: { product } })
        }).as('updateProduct')
        fetchFromApp('PATCH', `/api/v1/businesses/products/${productId}`, {
            description: serverDescription,
        })
        cy.wait('@updateProduct')

        cy.visit(`/${activeSlug}`)
        cy.wait('@getCatalog')
        cy.contains('Bebida fría de 355 ml.').should('be.visible')
    })

    it('rechaza el pedido si el producto se desactiva mientras está en el carrito', () => {
        visitPublicCatalog()
        addProductToCart()
        cy.intercept('PATCH', `${productPath}/status`, {
            statusCode: 200,
            body: { product: { ...product, isAvailable: false } },
        }).as('disableProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/orders', {
            statusCode: 400,
            body: { error: { code: 'ORDER_PRODUCT_NOT_AVAILABLE' } },
        }).as('createOrder')
        fetchFromApp('PATCH', `/api/v1/businesses/products/${productId}/status`, { active: false })
        cy.wait('@disableProduct')
        openCheckout()
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[data-testid="order-error"]')
            .should('be.visible')
            .and('contain', 'Uno de los productos seleccionados ya no está disponible.')
    })

    it('rechaza el pedido si el producto se desactiva durante el checkout', () => {
        visitPublicCatalog()
        addProductToCart()
        openCheckout()
        cy.intercept('PATCH', `${productPath}/status`, {
            statusCode: 200,
            body: { product: { ...product, isAvailable: false } },
        }).as('disableProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/orders', {
            statusCode: 400,
            body: { error: { code: 'ORDER_PRODUCT_NOT_AVAILABLE' } },
        }).as('createOrder')
        fetchFromApp('PATCH', `/api/v1/businesses/products/${productId}/status`, { active: false })
        cy.wait('@disableProduct')
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[data-testid="order-error"]')
            .should('be.visible')
            .and('contain', 'Uno de los productos seleccionados ya no está disponible.')
    })

    it('mantiene abierto el detalle aunque el producto se elimine y rechaza el pedido', () => {
        visitPublicCatalog()
        cy.contains('article', productName).contains('button', productName).click()
        cy.get('[role="dialog"][aria-labelledby="customize-title"]')
            .should('contain', 'Coca Cola')
            .and('contain', '$100.00')

        cy.intercept('DELETE', productPath, { statusCode: 204, body: null }).as('deleteProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/orders', {
            statusCode: 400,
            body: { error: { code: 'ORDER_PRODUCT_NOT_AVAILABLE' } },
        }).as('createOrder')
        fetchFromApp('DELETE', `/api/v1/businesses/products/${productId}`)
        cy.wait('@deleteProduct')
        cy.get('[role="dialog"][aria-labelledby="customize-title"]')
            .should('contain', 'Coca Cola')
            .contains('button', 'Agregar al pedido')
            .click()
        openCheckout()
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[data-testid="order-error"]')
            .should('be.visible')
            .and('contain', 'Uno de los productos seleccionados ya no está disponible.')
    })

    it('permite crear otro producto con el mismo nombre después de eliminar uno sin pedidos', () => {
        let deleted = false
        cy.intercept('DELETE', productPath, (request) => {
            deleted = true
            request.reply({ statusCode: 204, body: null })
        }).as('deleteProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/products', (request) => {
            expect(deleted).to.eq(true)
            request.reply({
                statusCode: 201,
                body: {
                    product: {
                        ...product,
                        id: 'product-same-name-new',
                        name: 'Coca Cola',
                    },
                },
            })
        }).as('createProduct')

        fetchFromApp('DELETE', `/api/v1/businesses/products/${productId}`)
        cy.wait('@deleteProduct')
        fetchFromApp('POST', `/api/v1/businesses/${businessId}/products`, {
            categoryId: 'category-product-concurrency-e2e',
            name: 'Coca Cola',
            description: 'Nuevo producto con el mismo nombre.',
            price: 120,
        })
        cy.wait('@createProduct').its('response.body.product').should('deep.include', {
            id: 'product-same-name-new',
            name: 'Coca Cola',
        })
    })
})

export {}
