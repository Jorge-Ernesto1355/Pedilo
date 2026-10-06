const slug = 'la-esquina-dashboard'
const businessId = 'business-dashboard-e2e'
const productId = 'product-dashboard-e2e'
const orderId = 'order-dashboard-e2e'
const orderNumber = 3048

type CreatedOrder = {
    id: string
    orderNumber: number
    status: 'PENDING'
    customerId: string
    subtotal: number
    total: number
    customerName: string
    customerPhone: string
    notes: string | null
    items: Array<{
        id: string
        productId: string
        productName: string
        quantity: number
        unitPrice: number
        subtotal: number
        options: []
    }>
    statusHistory: Array<{ id: string; status: 'PENDING'; createdAt: string }>
    createdAt: string
    updatedAt: string
}

const publicCatalog = {
    business: {
        id: businessId,
        name: 'La Esquina',
        slug,
        description: 'Comida casera para llevar.',
        logoUrl: null,
        logoBlurUrl: null,
        coverUrl: null,
        coverBlurUrl: null,
        ubication: 'Culiacán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: null,
        whatsappNumber: '+526671234567',
    },
    menus: [
        {
            id: 'menu-dashboard-e2e',
            businessId,
            name: 'Menú principal',
            description: 'Lo más pedido.',
            isActive: true,
            categories: [
                {
                    id: 'category-dashboard-e2e',
                    businessId,
                    menuId: 'menu-dashboard-e2e',
                    name: 'Platillos',
                    description: null,
                    sortOrder: 0,
                    isActive: true,
                    products: [
                        {
                            id: productId,
                            businessId,
                            categoryId: 'category-dashboard-e2e',
                            name: 'Hamburguesa de la casa',
                            description: 'Carne, queso y vegetales.',
                            price: 149,
                            imageUrl: null,
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [],
                        },
                    ],
                },
            ],
        },
    ],
}

function installPublicOrderApi(onCreated: (order: CreatedOrder) => void) {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: publicCatalog,
    }).as('getPublicCatalog')

    cy.intercept('POST', '**/businesses/*/orders', (request) => {
        const payload = request.body as {
            customer: { name: string; phone: string }
            items: Array<{ productId: string; quantity: number; optionIds: string[] }>
            notes?: string
        }
        const item = payload.items[0]
        const order: CreatedOrder = {
            id: orderId,
            orderNumber,
            status: 'PENDING',
            customerId: 'customer-dashboard-e2e',
            subtotal: 149,
            total: 149,
            customerName: payload.customer.name,
            customerPhone: payload.customer.phone,
            notes: payload.notes ?? null,
            items: [
                {
                    id: 'order-item-dashboard-e2e',
                    productId: item.productId,
                    productName: 'Hamburguesa de la casa',
                    quantity: item.quantity,
                    unitPrice: 149,
                    subtotal: 149,
                    options: [],
                },
            ],
            statusHistory: [
                {
                    id: 'history-dashboard-e2e',
                    status: 'PENDING',
                    createdAt: '2026-10-04T18:30:00.000Z',
                },
            ],
            createdAt: '2026-10-04T18:30:00.000Z',
            updatedAt: '2026-10-04T18:30:00.000Z',
        }
        onCreated(order)
        request.alias = 'createPublicOrder'
        request.reply({ statusCode: 201, body: { order } })
    })
}

function installDashboardOrderApi(order: CreatedOrder) {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-dashboard-e2e',
            businessId,
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        request.alias = 'getDashboardOrders'
        request.reply({
            statusCode: 200,
            body: { orders: [order], page: 1, limit: 20, total: 1 },
        })
    })

    cy.intercept('GET', `**/businesses/orders/${order.id}`, {
        statusCode: 200,
        body: { order },
    }).as('getDashboardOrder')
}

describe('Pedido público visible en el dashboard', () => {
    it('muestra la nueva orden con sus datos en el restaurante', () => {
        let createdOrder: CreatedOrder
        installPublicOrderApi((order) => {
            createdOrder = order
        })

        cy.visit(`/${slug}`)
        cy.wait('@getPublicCatalog')
        cy.window().then((window) => {
            cy.stub(window, 'open').returns({
                document: { title: '', body: { innerHTML: '' } },
                location: { href: '' },
                close: () => undefined,
            })
        })

        cy.contains('button', 'Agregar al carrito').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type('María López')
        cy.get('#customer-phone').type('669-555-1234')
        cy.get('#order-notes').type('Entregar en recepción')
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createPublicOrder')

        cy.login()
        cy.then(() => {
            installDashboardOrderApi(createdOrder)
        })
        cy.visit('/dashboard/orders')
        cy.wait('@getDashboardOrders')

        cy.get('article')
            .should('be.visible')
            .and('contain', `Pedido #${orderNumber}`)
            .and('contain', 'María López')
            .and('contain', '$149.00')
            .and('contain', 'Nueva')
        cy.get('article').contains('button', `Pedido #${orderNumber}`).click()
        cy.wait('@getDashboardOrder')

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', `Pedido #${orderNumber}`).should('be.visible')
                cy.contains('Cliente').should('be.visible')
                cy.contains('María López').should('be.visible')
                cy.contains('669-555-1234').should('be.visible')
                cy.contains('Hamburguesa de la casa').should('be.visible')
                cy.contains('1 × Hamburguesa de la casa').should('be.visible')
                cy.contains('$149.00').should('be.visible')
                cy.contains('Nueva').should('be.visible')
                cy.contains('Orden recibida').should('be.visible')
                cy.contains('Entregar en recepción').should('be.visible')
            })
    })
})

export {}
