export {}

type RestaurantOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'

const product = {
    id: 'product-restaurant-order-burger',
    businessId: 'business-restaurant-order-e2e',
    categoryId: 'category-restaurant-order-food',
    name: 'Hamburguesa de la casa',
    description: 'Con papas',
    price: 120,
    imageUrl: null,
    sortOrder: 1,
    isAvailable: true,
    optionGroups: [],
}

const catalog = {
    business: {
        id: 'business-restaurant-order-e2e',
        name: 'Restaurante E2E',
        slug: 'restaurante-order-e2e',
        description: null,
        logoUrl: null,
        logoBlurUrl: null,
        coverUrl: null,
        coverBlurUrl: null,
        ubication: null,
        ubicationMaps: null,
        businessSchedule: null,
    },
    menus: [
        {
            id: 'menu-restaurant-order-food',
            businessId: 'business-restaurant-order-e2e',
            name: 'Comidas',
            description: null,
            isActive: true,
            categories: [
                {
                    id: 'category-restaurant-order-food',
                    businessId: 'business-restaurant-order-e2e',
                    menuId: 'menu-restaurant-order-food',
                    name: 'Hamburguesas',
                    description: null,
                    sortOrder: 1,
                    isActive: true,
                    products: [product],
                },
            ],
        },
    ],
}

function installRestaurantOrderApi() {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-restaurant-order-e2e',
            businessId: 'business-restaurant-order-e2e',
            currency: 'MXN',
            timezone: 'America/Mazatlan',
        },
    })
    cy.intercept('GET', '**/businesses/*/orders*', {
        body: { orders: [], page: 1, limit: 20, total: 0 },
    }).as('orders')
    cy.intercept('GET', '**/businesses/mine', {
        body: { business: { slug: 'restaurante-order-e2e' } },
    }).as('mineBusiness')
    cy.intercept('GET', '**/public/businesses/restaurante-order-e2e/catalog', {
        body: catalog,
    }).as('restaurantCatalog')
}

describe('Nueva orden desde el dashboard', () => {
    beforeEach(() => {
        cy.login()
        cy.then(installRestaurantOrderApi)
        cy.visit('/dashboard/orders')
        cy.wait('@orders')
    })

    it('abre el flujo, agrega un producto y permite continuar sin datos de cliente', () => {
        cy.contains('button', '+ Nueva orden').click()
        cy.contains('[role="dialog"]', 'Nueva orden').should('be.visible')
        cy.contains('Hamburguesa de la casa').should('be.visible')
        cy.contains('button', 'Agregar al carrito').click()
        cy.contains('[role="dialog"]', 'Tu orden').should('contain', '1 producto')
        cy.contains('button', 'Continuar').click()
        cy.contains('h3', 'Datos del cliente').should('be.visible')
        cy.get('button').contains('Crear orden').should('be.enabled')
    })

    it('envía solamente el contrato de restaurante y muestra el total del backend', () => {
        cy.intercept('POST', '**/businesses/*/orders/restaurant', (request) => {
            expect(request.body).to.deep.equal({
                customerName: 'Juan',
                customerPhone: '668-123-4567',
                notes: 'Sin cebolla',
                items: [
                    {
                        productId: product.id,
                        quantity: 2,
                        optionIds: [],
                    },
                ],
            })
            request.reply({
                statusCode: 201,
                body: {
                    order: {
                        id: 'order-restaurant-order-e2e-31',
                        orderNumber: 31,
                        status: 'PENDING' satisfies RestaurantOrderStatus,
                        source: 'RESTAURANT',
                        subtotal: 240,
                        total: 240,
                        customerId: null,
                        customerName: 'Juan',
                        customerPhone: '668-123-4567',
                        notes: 'Sin cebolla',
                        items: [],
                        statusHistory: [],
                    },
                },
            })
        }).as('createRestaurantOrder')

        cy.contains('button', '+ Nueva orden').click()
        cy.contains('button', 'Agregar al carrito').click()
        cy.get('button[aria-label="Agregar una unidad de Hamburguesa de la casa"]').click()
        cy.contains('button', 'Continuar').click()
        cy.get('input').filter('[autocomplete="name"]').type('Juan')
        cy.get('input').filter('[autocomplete="tel"]').type('6681234567')
        cy.get('textarea').type('Sin cebolla')
        cy.contains('button', 'Crear orden').click()
        cy.wait('@createRestaurantOrder')
        cy.contains('Orden #31').should('be.visible')
        cy.contains('Total confirmado:').should('contain', '$240.00')
    })
})
