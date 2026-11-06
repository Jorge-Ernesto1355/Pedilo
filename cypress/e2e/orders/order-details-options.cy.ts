const orderId = 'order-details-options-e2e'
const orderNumber = 6521
const createdAt = '2026-10-31T18:00:00.000Z'

const order = {
    id: orderId,
    orderNumber,
    customerId: 'customer-details-options-e2e',
    status: 'READY',
    source: 'PUBLIC',
    fulfillmentType: 'PICKUP',
    subtotal: 240,
    discountAmount: 0,
    total: 240,
    customerName: 'Cliente con extras',
    customerPhone: '6681236521',
    notes: 'Salsa aparte',
    items: [
        {
            id: 'order-item-details-options-e2e',
            productId: 'product-combo-details-options-e2e',
            productName: 'Combo familiar',
            quantity: 1,
            unitPrice: 240,
            unitPriceOriginal: 300,
            unitPriceFinal: 240,
            discountAmount: 60,
            discountLabel: '-20%',
            subtotal: 240,
            options: [
                {
                    id: 'order-option-included-burger',
                    name: '2× Hamburguesa clásica',
                    groupName: 'Productos incluidos',
                    price: 0,
                },
                {
                    id: 'order-option-included-fries',
                    name: 'Papas gajo',
                    groupName: 'Productos incluidos',
                    price: 0,
                },
                ...Array.from({ length: 5 }, (_, index) => ({
                    id: `order-option-queso-${index + 1}`,
                    name: 'Queso',
                    groupName: 'Complementos',
                    price: 5,
                })),
                {
                    id: 'order-option-tocino',
                    name: 'Tocino',
                    groupName: 'Complementos',
                    price: 15,
                },
                {
                    id: 'order-option-salsa',
                    name: 'Salsa verde',
                    groupName: 'Salsas',
                    price: 0,
                },
            ],
        },
    ],
    statusHistory: [{ id: 'history-details-options-e2e', status: 'READY', createdAt }],
    createdAt,
    updatedAt: createdAt,
}

describe('Detalle de orden con opciones de combo', () => {
    it('muestra grupos, combina opciones repetidas y mantiene las notas y modalidad', () => {
        cy.intercept('GET', '**/businesses/settings', {
            statusCode: 200,
            body: {
                id: 'settings-details-options-e2e',
                businessId: 'business-details-options-e2e',
                currency: 'MXN',
                timezone: 'America/Mazatlan',
            },
        })
        cy.intercept('GET', '**/businesses/*/orders*', (request) => {
            if (new URL(request.url).searchParams.get('limit') !== '1') request.alias = 'ordersList'
            request.reply({
                statusCode: 200,
                body: { orders: [order], page: 1, limit: 20, total: 1 },
            })
        })
        cy.intercept('GET', `**/businesses/orders/${orderId}`, {
            statusCode: 200,
            body: { order },
        }).as('getOrderDetail')
        cy.intercept('GET', `**/businesses/orders/${orderId}/discount`, {
            statusCode: 200,
            body: { discount: null },
        }).as('getCustomerDiscount')

        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.contains('article', `#${String(orderNumber).padStart(3, '0')}`)
            .contains('button', `#${String(orderNumber).padStart(3, '0')}`)
            .click()
        cy.wait('@getOrderDetail')

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', `Pedido #${orderNumber}`).should('be.visible')
                cy.contains('Cliente Con Extras').should('be.visible')
                cy.contains('+52 66 8123 6521').should('be.visible')
                cy.contains('Para llevar / recoger').should('be.visible')
                cy.contains('Combo familiar').should('be.visible')
                cy.contains('Productos incluidos').should('be.visible')
                cy.contains('li', '2× Hamburguesa clásica').should('be.visible')
                cy.contains('li', 'Papas gajo').should('be.visible')
                cy.contains('Complementos').should('be.visible')
                cy.contains('li', '5 × Queso').should('be.visible')
                cy.contains('li', 'Tocino').should('be.visible')
                cy.contains('Salsas').should('be.visible')
                cy.contains('li', 'Salsa verde').should('be.visible')
                cy.get('li').filter(':contains("Queso")').should('have.length', 1)
                cy.contains('Salsa aparte').should('be.visible')
                cy.contains('$300.00 c/u').should('be.visible')
                cy.contains('$240.00 c/u').should('be.visible')
                cy.contains('-20%').should('be.visible')
                cy.contains('$240.00').should('be.visible')
            })
        cy.wait('@getCustomerDiscount')
    })
})

export {}
