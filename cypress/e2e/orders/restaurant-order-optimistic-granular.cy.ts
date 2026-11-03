export {}

const businessId = 'business-restaurant-order-optimistic-e2e'
const product = {
    id: 'product-restaurant-order-optimistic-e2e',
    businessId,
    categoryId: 'category-restaurant-order-optimistic-e2e',
    name: 'Hamburguesa optimista',
    description: 'Producto para validar la orden inmediata.',
    price: 120,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    sortOrder: 1,
    optionGroups: [],
}

const menus = [
    {
        id: 'menu-restaurant-order-optimistic-e2e',
        businessId,
        name: 'Menú de pruebas',
        description: null,
        isActive: true,
        categories: [
            {
                id: 'category-restaurant-order-optimistic-e2e',
                businessId,
                menuId: 'menu-restaurant-order-optimistic-e2e',
                name: 'Hamburguesas',
                description: null,
                sortOrder: 1,
                isActive: true,
                products: [product],
            },
        ],
    },
]

const persistedOrder = {
    id: 'order-restaurant-order-optimistic-e2e',
    businessId,
    orderNumber: 47,
    status: 'PENDING',
    source: 'RESTAURANT',
    fulfillmentType: 'DINE_IN',
    customerId: null,
    subtotal: 240,
    discountAmount: 0,
    total: 240,
    customerName: 'Cliente optimista',
    customerPhone: '6681234567',
    notes: 'Sin cebolla y con salsa aparte',
    items: [
        {
            id: 'item-restaurant-order-optimistic-e2e',
            productId: product.id,
            productName: product.name,
            quantity: 2,
            unitPrice: 120,
            subtotal: 240,
            options: [],
        },
    ],
    statusHistory: [{ status: 'PENDING', createdAt: '2026-11-02T18:00:00.000Z' }],
    createdAt: '2026-11-02T18:00:00.000Z',
    updatedAt: '2026-11-02T18:00:00.000Z',
}

function installBaseApi() {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-restaurant-order-optimistic-e2e',
            businessId,
            currency: 'MXN',
            timezone: 'America/Mazatlan',
        },
    })
    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: { business: { slug: 'restaurant-order-optimistic-e2e' } },
    })
    cy.intercept('GET', '**/businesses/mine/menus', {
        statusCode: 200,
        body: menus,
    }).as('restaurantMenus')
    cy.intercept('GET', '**/businesses/*/products*', {
        statusCode: 200,
        body: { products: [product], page: 1, limit: 100, total: 1 },
    }).as('restaurantProducts')
    cy.intercept('GET', '**/businesses/*/orders*', {
        statusCode: 200,
        body: { orders: [], page: 1, limit: 20, total: 0 },
    }).as('orders')
}

function openAndFillOrder() {
    cy.contains('button', '+ Nueva orden').click()
    cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
        .should('be.visible')
        .within(() => {
            cy.contains(product.name).should('be.visible')
            cy.contains('button', 'Agregar al carrito').click()
            cy.get('button[aria-label="Agregar una unidad de Hamburguesa optimista"]').click()
            cy.contains('button', 'Continuar').click()
            cy.get('input[autocomplete="name"]').type('Cliente optimista')
            cy.get('input[autocomplete="tel"]').type('6681234567')
            cy.get('#restaurant-order-notes').type('Sin cebolla y con salsa aparte')
        })
}

function submitOrder() {
    cy.contains('[role="dialog"] button', 'Crear orden').click()
}

function servePersistedOrderOnListRefresh() {
    cy.intercept('GET', '**/businesses/*/orders*', {
        statusCode: 200,
        body: { orders: [persistedOrder], page: 1, limit: 20, total: 1 },
    }).as('ordersAfterCreate')
}

describe('Nueva orden desde Pedidos: optimistic UI granular', () => {
    beforeEach(() => {
        cy.login()
        cy.then(installBaseApi)
        cy.visit('/dashboard/orders')
        cy.wait('@orders')
    })

    it('cierra el drawer inmediatamente después de crear la orden', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 1000,
            statusCode: 201,
            body: { order: persistedOrder },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()

        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]').should('not.exist')
        cy.wait('@createRestaurantOrder')
    })

    it('muestra inmediatamente productos, cantidades, cliente, nota y total estimado', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 1000,
            statusCode: 201,
            body: { order: persistedOrder },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()
        servePersistedOrderOnListRefresh()

        cy.contains('article', 'Nueva orden')
            .should('be.visible')
            .and('contain', 'Cliente Optimista')
            .and('contain', 'Hamburguesa optimista')
            .and('contain', '2x')
            .and('contain', 'Tiene nota')
            .and('contain', '240')
        cy.wait('@createRestaurantOrder')
    })

    it('muestra el estado discreto Guardando orden y bloquea acciones de la tarjeta', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 1000,
            statusCode: 201,
            body: { order: persistedOrder },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()

        cy.contains('[role="status"]', 'Guardando orden…').should('be.visible')
        cy.contains('article', 'Nueva orden').find('button').each(($button) => {
            cy.wrap($button).should('be.disabled')
        })
        cy.wait('@createRestaurantOrder')
    })

    it('reemplaza la tarjeta temporal con la respuesta persistida del backend', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 500,
            statusCode: 201,
            body: { order: persistedOrder },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()
        cy.contains('article', 'Nueva orden').should('be.visible')
        servePersistedOrderOnListRefresh()

        cy.wait('@createRestaurantOrder')
        cy.contains('article', '#047')
            .should('be.visible')
            .and('contain', 'Cliente Optimista')
        cy.contains('article', '#047').should('not.contain', 'Guardando orden…')
        cy.get('article').should('have.length', 1)
    })

    it('envía Idempotency-Key y no permite que el navegador falsifique campos calculados', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', (request) => {
            expect(request.headers['idempotency-key']).to.match(/^[A-Za-z0-9_-]{16,128}$/)
            expect(request.body).to.deep.equal({
                customerName: 'Cliente optimista',
                customerPhone: '6681234567',
                notes: 'Sin cebolla y con salsa aparte',
                items: [{ productId: product.id, quantity: 2, optionIds: [] }],
            })
            expect(request.body).not.to.have.any.keys(
                'id',
                'source',
                'status',
                'price',
                'subtotal',
                'total',
                'businessId',
            )
            request.reply({ statusCode: 201, body: { order: persistedOrder } })
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()
        cy.wait('@createRestaurantOrder')
    })

    it('reconcilia la respuesta HTTP sin duplicar la tarjeta optimista', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            statusCode: 201,
            body: { order: persistedOrder },
        }).as('createRestaurantOrder')

        servePersistedOrderOnListRefresh()
        openAndFillOrder()
        submitOrder()
        cy.wait('@createRestaurantOrder')
        cy.get('article').should('have.length', 1).and('contain', '#047')
        cy.get('article').should('not.contain', 'Guardando orden…')
    })

    it('retira la orden temporal cuando el backend devuelve un error definitivo', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 300,
            statusCode: 422,
            body: { error: { code: 'INVALID_ORDER_ITEMS', message: 'Los productos ya no están disponibles.' } },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()
        cy.contains('article', 'Nueva orden').should('be.visible')
        cy.wait('@createRestaurantOrder')
        cy.contains('article', 'Nueva orden').should('not.exist')
        cy.contains('No se pudo crear la orden').should('be.visible')
    })

    it('mantiene la orden visible con aviso cuando el resultado es incierto', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', {
            delay: 300,
            statusCode: 503,
            body: { error: { code: 'SERVICE_UNAVAILABLE' } },
        }).as('createRestaurantOrder')

        openAndFillOrder()
        submitOrder()
        cy.contains('article', 'Nueva orden').should('be.visible')
        cy.wait('@createRestaurantOrder')
        cy.get('article')
            .should('be.visible')
            .and('contain', 'Verifica la lista para confirmar')
        cy.contains('No pudimos confirmar la orden').should('be.visible')
    })

    it('mantiene la validación del flujo: no permite crear sin productos', () => {
        cy.contains('button', '+ Nueva orden').click()
        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains(product.name).should('be.visible')
            })
    })
})
