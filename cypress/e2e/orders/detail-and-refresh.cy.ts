import {
    assertDialogFitsViewport,
    assertPageFitsViewport,
    assertTouchTargets,
} from '../../support/responsive'

type DetailStatus = 'PENDING' | 'PREPARING' | 'READY'
const mobileViewports = [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
]

const orderId = 'order-detail-refresh-e2e'
const orderNumber = 5120
const history = [
    {
        id: 'history-detail-pending',
        status: 'PENDING' as const,
        createdAt: '2026-10-04T17:32:00.000Z',
    },
    {
        id: 'history-detail-preparing',
        status: 'PREPARING' as const,
        createdAt: '2026-10-04T17:35:00.000Z',
    },
    {
        id: 'history-detail-ready',
        status: 'READY' as const,
        createdAt: '2026-10-04T17:47:00.000Z',
    },
]

const baseOrder = {
    id: orderId,
    orderNumber,
    customerId: 'customer-detail-refresh-e2e',
    subtotal: 358,
    total: 358,
    customerName: 'Jorge Ramírez',
    customerPhone: '668-321-4567',
    notes: 'Sin cebolla',
    items: [
        {
            id: 'item-detail-refresh-1',
            productId: 'product-pizza-detail',
            productName: 'Pizza familiar',
            quantity: 2,
            unitPrice: 179,
            subtotal: 358,
            options: [],
        },
    ],
    statusHistory: history,
    createdAt: history[0].createdAt,
    updatedAt: history[2].createdAt,
}

function installDashboardApi(state: { status: DetailStatus }, historyData = history) {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-detail-refresh-e2e',
            businessId: 'business-detail-refresh-e2e',
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
            createdAt: baseOrder.createdAt,
            updatedAt: baseOrder.updatedAt,
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        const requestStatus = url.searchParams.get('status')
        const requestSearch = url.searchParams.get('search')?.toLowerCase() ?? ''
        const matchesStatus = !requestStatus || requestStatus === state.status
        const matchesSearch =
            !requestSearch || baseOrder.customerName.toLowerCase().includes(requestSearch)
        request.alias = requestStatus
            ? requestSearch
                ? 'filteredOrders'
                : 'filteredStatusOrders'
            : 'listOrders'
        request.reply({
            statusCode: 200,
            body: {
                orders:
                    matchesStatus && matchesSearch
                        ? [{ ...baseOrder, status: state.status, statusHistory: historyData }]
                        : [],
                page: 1,
                limit: 20,
                total: matchesStatus && matchesSearch ? 1 : 0,
            },
        })
    })

    cy.intercept('GET', `**/businesses/orders/${orderId}`, {
        statusCode: 200,
        body: { order: { ...baseOrder, status: state.status, statusHistory: historyData } },
    }).as('getOrderDetail')

    cy.intercept('PATCH', `**/businesses/orders/${orderId}/status`, (request) => {
        request.alias = 'updateOrderStatus'
        state.status = request.body.status as DetailStatus
        request.reply({
            delay: 250,
            statusCode: 200,
            body: { order: { ...baseOrder, status: state.status, statusHistory: historyData } },
        })
    })
}

function orderCard() {
    return cy.contains('article', `Pedido #${orderNumber}`)
}

describe('Detalle e historial de órdenes', () => {
    it('muestra cliente, productos, totales y el historial real con timestamps', () => {
        const state: { status: DetailStatus } = { status: 'READY' }

        cy.login()
        cy.then(() => installDashboardApi(state))
        cy.visit('/dashboard/orders')
        cy.wait('@listOrders')
        orderCard().contains('button', `Pedido #${orderNumber}`).click()
        cy.wait('@getOrderDetail')

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', `Pedido #${orderNumber}`).should('be.visible')
                cy.contains('Jorge Ramírez').should('be.visible')
                cy.contains('668-321-4567').should('be.visible')
                cy.contains('2 × Pizza familiar').should('be.visible')
                cy.contains('$358.00').should('be.visible')
                cy.contains('¡Lista!').should('be.visible')
                cy.contains('Actual').should('be.visible')
                cy.contains('Sin cebolla').should('be.visible')

                cy.get('[aria-labelledby="order-history-title"]')
                    .should('contain', 'Historial de la orden')
                    .and('contain', 'Nueva')
                    .and('contain', 'Preparando')
                    .and('contain', '¡Lista!')
                    .and('contain', 'Orden recibida')
                    .and('contain', 'El restaurante está preparando la orden')
                    .and('contain', 'La orden está lista para entregar')
                cy.get('time[datetime="2026-10-04T17:32:00.000Z"]')
                    .should('be.visible')
                    .and('contain.text', '10:32')
                cy.get('time[datetime="2026-10-04T17:35:00.000Z"]')
                    .should('be.visible')
                    .and('contain.text', '10:35')
                cy.get('time[datetime="2026-10-04T17:47:00.000Z"]')
                    .should('be.visible')
                    .and('contain.text', '10:47')
            })
    })
})

describe('Persistencia de órdenes después de refresh', () => {
    it('conserva sesión, ruta y estado; permite volver a filtrar después de recargar', () => {
        const state: { status: DetailStatus } = { status: 'PENDING' }

        cy.login()
        cy.then(() => installDashboardApi(state, [history[0]]))
        cy.visit('/dashboard/orders')
        cy.wait('@listOrders')

        orderCard().contains('button', 'Empezar a preparar').click()
        cy.wait('@updateOrderStatus')
        cy.reload()
        cy.location('pathname').should('eq', '/dashboard/orders')
        cy.wait('@listOrders')
        orderCard().contains('Preparando').should('be.visible')
        cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').should(
            'have.value',
            '',
        )
        cy.get('select[aria-label="Filtrar pedidos por estado"]')
            .should('have.value', '')
            .select('PREPARING')
        cy.wait('@filteredStatusOrders').its('request.url').should('include', 'status=PREPARING')
        orderCard().contains('Preparando').should('be.visible')

        cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').type('Jorge')
        cy.wait('@filteredOrders').then(({ request }) => {
            expect(request.url).to.include('search=Jorge')
            expect(request.url).to.include('status=PREPARING')
        })
        orderCard().should('be.visible')
    })
})

describe('Detalle de órdenes en móvil', () => {
    mobileViewports.forEach(({ width, height }) => {
        it(`abre y permite leer el detalle en ${width}×${height}`, () => {
            const state: { status: DetailStatus } = { status: 'READY' }

            cy.viewport(width, height)
            cy.login()
            cy.then(() => installDashboardApi(state))
            cy.visit('/dashboard/orders')
            cy.wait('@listOrders')
            assertPageFitsViewport()

            orderCard().contains('button', `Pedido #${orderNumber}`).click()
            cy.wait('@getOrderDetail')
            assertDialogFitsViewport('[role="dialog"][aria-labelledby="order-detail-title"]')
            assertTouchTargets('button[aria-label="Cerrar detalle"]')
            cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
                .should('contain', 'Jorge Ramírez')
                .and('contain', 'Pizza familiar')
                .and('contain', '¡Lista!')
                .and('contain', 'Historial de la orden')
            assertPageFitsViewport()
        })
    })
})

export {}
