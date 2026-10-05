type TestOrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'

const order = {
    id: 'order-status-flow-e2e',
    orderNumber: 4096,
    customerId: 'customer-status-flow-e2e',
    subtotal: 189,
    total: 189,
    customerName: 'Jorge Martínez',
    customerPhone: '669-555-4096',
    notes: null,
    items: [
        {
            id: 'order-item-status-flow-e2e',
            productId: 'product-status-flow-e2e',
            productName: 'Taco especial',
            quantity: 1,
            unitPrice: 189,
            subtotal: 189,
            options: [],
        },
    ],
    statusHistory: [
        {
            id: 'history-pending-status-flow-e2e',
            status: 'PENDING' as const,
            createdAt: '2026-10-04T18:30:00.000Z',
        },
    ],
    createdAt: '2026-10-04T18:30:00.000Z',
    updatedAt: '2026-10-04T18:30:00.000Z',
}

function installStatusApi(state: { status: TestOrderStatus }, counters: { updates: number }) {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-status-flow-e2e',
            businessId: 'business-status-flow-e2e',
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
        const requestStatus = new URL(request.url).searchParams.get('status')
        request.alias = requestStatus === 'CANCELLED' ? 'listCancelledOrders' : 'listOrders'
        request.reply({
            statusCode: 200,
            body: {
                orders: [{ ...order, status: state.status }],
                page: 1,
                limit: 20,
                total: 1,
            },
        })
    })

    cy.intercept('PATCH', `**/businesses/orders/${order.id}/status`, (request) => {
        request.alias = 'updateOrderStatus'
        counters.updates += 1
        state.status = request.body.status as TestOrderStatus
        request.reply({
            delay: 350,
            statusCode: 200,
            body: { order: { ...order, status: state.status } },
        })
    })
}

function orderCard() {
    return cy.contains('article', `Pedido #${order.orderNumber}`)
}

describe('Cambio rápido de estados de órdenes', () => {
    it('avanza Nueva → Preparando → ¡Lista! desde la lista sin duplicar actualizaciones', () => {
        const state: { status: TestOrderStatus } = { status: 'PENDING' }
        const counters = { updates: 0 }

        cy.login()
        cy.then(() => installStatusApi(state, counters))
        cy.visit('/dashboard/orders')
        cy.wait('@listOrders')

        orderCard().within(() => {
            cy.contains('Nueva').should('be.visible')
            cy.contains('button', 'Empezar a preparar').click()
        })

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]').should('not.exist')
        orderCard().contains('button', 'Actualizando…').should('be.disabled').click({ force: true })
        cy.wait('@updateOrderStatus')
        cy.then(() => expect(counters.updates).to.eq(1))
        cy.wait('@listOrders')

        orderCard().within(() => {
            cy.contains('Preparando').should('be.visible')
            cy.contains('button', 'Marcar como lista').should('be.visible')
        })

        orderCard().contains('button', 'Marcar como lista').click()
        orderCard().contains('button', 'Actualizando…').should('be.disabled').click({ force: true })
        cy.wait('@updateOrderStatus')
        cy.then(() => expect(counters.updates).to.eq(2))
        cy.wait('@listOrders')

        orderCard().within(() => {
            cy.contains('¡Lista!').should('be.visible')
            cy.contains('button', 'Marcar como lista').should('not.exist')
            cy.contains('button', 'Empezar a preparar').should('not.exist')
        })

        cy.reload()
        cy.wait('@listOrders')
        orderCard().within(() => {
            cy.contains('¡Lista!').should('be.visible')
        })
        cy.then(() => expect(state.status).to.eq('READY'))
    })

    it('cancela una orden nueva, la muestra en el filtro y bloquea avances posteriores', () => {
        const state: { status: TestOrderStatus } = { status: 'PENDING' }
        const counters = { updates: 0 }

        cy.login()
        cy.then(() => installStatusApi(state, counters))
        cy.visit('/dashboard/orders')
        cy.wait('@listOrders')

        orderCard().within(() => {
            cy.contains('Nueva').should('be.visible')
            cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).click()
        })

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]').should('not.exist')
        orderCard().contains('button', 'Actualizando…').should('be.disabled').click({ force: true })
        cy.wait('@updateOrderStatus')
        cy.then(() => expect(counters.updates).to.eq(1))
        cy.wait('@listOrders')

        orderCard().within(() => {
            cy.contains('Cancelada').should('be.visible')
            cy.contains('button', 'Empezar a preparar').should('not.exist')
            cy.contains('button', 'Marcar como lista').should('not.exist')
            cy.get(`button[aria-label="Cancelar pedido #${order.orderNumber}"]`).should('not.exist')
        })

        cy.get('select[aria-label="Filtrar pedidos por estado"]').select('CANCELLED')
        cy.wait('@listCancelledOrders').its('request.url').should('include', 'status=CANCELLED')
        orderCard().contains('Cancelada').should('be.visible')
        cy.then(() => expect(state.status).to.eq('CANCELLED'))
    })
})

export {}
