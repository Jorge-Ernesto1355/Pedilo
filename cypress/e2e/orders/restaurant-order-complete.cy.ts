export {}

const product = {
    id: 'product-restaurant-order-complete',
    name: 'Hamburguesa E2E',
    categoryId: 'category-restaurant-order-complete',
    description: 'Producto de prueba para nueva orden',
    price: 95,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    sortOrder: 1,
    optionGroups: [],
}

const menuResponse = [
    {
        id: 'menu-restaurant-order-complete',
        name: 'Comidas E2E',
        description: null,
        isActive: true,
        categories: [
            {
                id: 'category-restaurant-order-complete',
                menuId: 'menu-restaurant-order-complete',
                name: 'Hamburguesas E2E',
                description: null,
                isActive: true,
                sortOrder: 1,
                products: [product],
            },
        ],
    },
]

function installOrderFlowApi() {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-restaurant-order-complete',
            businessId: 'business-restaurant-order-complete',
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
        },
    })

    cy.intercept('GET', '**/businesses/mine/menus', {
        statusCode: 200,
        body: menuResponse,
    }).as('menus')

    cy.intercept('GET', '**/businesses/*/products*', {
        statusCode: 200,
        body: {
            products: [product],
            page: 1,
            limit: 100,
            total: 1,
        },
    }).as('products')

    cy.intercept('GET', '**/businesses/*/orders*', {
        statusCode: 200,
        body: { orders: [], page: 1, limit: 20, total: 0 },
    }).as('orders')
}

describe('Flujo completo de nueva orden desde el dashboard', () => {
    it('inicia sesión, abre Pedidos y crea una orden desde el dashboard', () => {
        cy.login()
        cy.location('pathname').should('eq', '/dashboard')

        cy.then(installOrderFlowApi)
        cy.visit('/dashboard/orders')
        cy.wait('@orders')
        cy.contains('h1', 'Pedidos').should('be.visible')

        cy.contains('button', '+ Nueva orden').should('be.visible').click()
        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('Hamburguesa E2E').should('be.visible')
                cy.contains('Hamburguesas E2E').should('be.visible')
                cy.contains('button', 'Agregar al carrito').click()
                cy.contains('1 producto').should('be.visible')
                cy.get('button[aria-label="Agregar una unidad de Hamburguesa E2E"]').click()
                cy.contains('2 productos').should('be.visible')
                cy.contains('button', 'Continuar').click()
            })

        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
            .should('contain', 'Datos del cliente')
            .and('contain', 'Todos son opcionales.')
        cy.contains('Nombre (opcional)').should('be.visible')
        cy.contains('Teléfono (opcional)').should('be.visible')
        cy.contains('Notas (opcional)').should('be.visible')

        cy.get('input[autocomplete="name"]').type('Juan E2E')
        cy.get('input[autocomplete="tel"]').type('6681234567')
        cy.get('textarea').type('Sin cebolla')

        cy.intercept('POST', '**/businesses/*/orders/restaurant', (request) => {
            expect(request.body).to.deep.equal({
                customerName: 'Juan E2E',
                customerPhone: '6681234567',
                notes: 'Sin cebolla',
                items: [
                    {
                        productId: product.id,
                        quantity: 2,
                        optionIds: [],
                    },
                ],
            })
            expect(request.body).not.to.have.any.keys(
                'price',
                'subtotal',
                'total',
                'source',
                'status',
                'businessId',
            )
            request.reply({
                statusCode: 201,
                body: {
                    order: {
                        id: 'order-restaurant-order-complete',
                        orderNumber: 1,
                        businessId: 'business-restaurant-order-complete',
                        customerId: null,
                        status: 'PENDING',
                        source: 'RESTAURANT',
                        subtotal: 190,
                        total: 190,
                        customerName: 'Juan E2E',
                        customerPhone: '6681234567',
                        notes: 'Sin cebolla',
                        items: [],
                        statusHistory: [],
                    },
                },
            })
        }).as('createRestaurantOrder')

        cy.contains('button', 'Crear orden').click()
        cy.wait('@createRestaurantOrder')
        cy.wait('@orders')
        cy.contains('h3', 'Orden creada').should('be.visible')
        cy.contains('Orden #1').should('be.visible')
        cy.contains('Total confirmado:').should('contain', '$190.00')
    })
})
