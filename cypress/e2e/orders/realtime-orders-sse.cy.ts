const businessId = 'business-orders-sse-e2e'
const menuId = 'menu-orders-sse-e2e'
const categoryId = 'category-orders-sse-e2e'
const productId = 'product-orders-sse-e2e'
const orderId = 'order-created-orders-sse-e2e'
const createdAt = '2026-10-31T18:00:00.000Z'

const product = {
    id: productId,
    businessId,
    categoryId,
    name: 'Torta de asada SSE',
    description: 'Orden para validar los eventos en tiempo real.',
    price: 125,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    sortOrder: 0,
    optionGroups: [],
}

const menu = {
    id: menuId,
    businessId,
    name: 'Menú SSE Cypress',
    description: null,
    isActive: true,
    categories: [
        {
            id: categoryId,
            menuId,
            name: 'Platillos SSE',
            description: null,
            isActive: true,
            sortOrder: 0,
            products: [],
        },
    ],
}

type OrderState = {
    orderPosted: boolean
    eventSent: boolean
    orderVisibleInList: boolean
    streamConnections: number
    postedId: string | null
    order: Record<string, unknown> | null
}

function installOrderAndStreamApi(state: OrderState) {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-orders-sse-e2e',
            businessId,
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
        },
    })

    cy.intercept('GET', '**/businesses/mine/menus', {
        statusCode: 200,
        body: [menu],
    }).as('getMenus')

    cy.intercept('GET', '**/businesses/*/products*', {
        statusCode: 200,
        body: { products: [product], page: 1, limit: 100, total: 1 },
    }).as('getProducts')

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        if (url.searchParams.get('limit') !== '1') request.alias = 'ordersList'
        const matchesSearch =
            !url.searchParams.get('search') ||
            (state.order?.customerName as string | undefined)
                ?.toLowerCase()
                .includes((url.searchParams.get('search') ?? '').toLowerCase())
        const includeOrder = state.orderVisibleInList && Boolean(matchesSearch)
        request.reply({
            statusCode: 200,
            body: {
                orders: includeOrder && state.order ? [state.order] : [],
                page: 1,
                limit: 20,
                total: includeOrder ? 1 : 0,
            },
        })
    })

    cy.intercept('GET', '**/api/orders/events', (request) => {
        state.streamConnections += 1
        request.alias = 'orderEventsStream'
        const frame =
            state.orderPosted && !state.eventSent && state.postedId
                ? `id: event-${state.postedId}\nevent: new_order\ndata: ${JSON.stringify({
                      eventId: `event-${state.postedId}`,
                      type: 'new_order',
                      orderId: state.postedId,
                      createdAt,
                      source: 'RESTAURANT',
                  })}\n\n`
                : ': connected\n\n'
        if (state.orderPosted && !state.eventSent) state.eventSent = true
        request.reply({
            statusCode: 200,
            headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
            },
            body: frame,
        })
    })

    cy.intercept('POST', '**/businesses/*/orders/restaurant', (request) => {
        request.alias = 'createRestaurantOrder'
        expect(request.body).to.include({
            customerName: 'Cliente SSE Cypress',
            customerPhone: '6691236382',
            notes: 'Pedido de prueba del stream',
        })
        expect(request.body.items).to.deep.equal([{ productId, quantity: 1, optionIds: [] }])

        state.postedId = orderId
        state.orderPosted = true
        state.order = {
            id: orderId,
            orderNumber: 6382,
            status: 'PENDING',
            source: 'RESTAURANT',
            fulfillmentType: 'DINE_IN',
            customerId: null,
            subtotal: 125,
            discountAmount: 0,
            total: 125,
            customerName: 'Cliente SSE Cypress',
            customerPhone: '6691236382',
            notes: 'Pedido de prueba del stream',
            items: [
                {
                    id: 'order-item-orders-sse-e2e',
                    productId,
                    productName: product.name,
                    quantity: 1,
                    unitPrice: 125,
                    subtotal: 125,
                    options: [],
                },
            ],
            statusHistory: [{ status: 'PENDING', createdAt }],
            createdAt,
            updatedAt: createdAt,
        }
        request.reply({
            statusCode: 201,
            body: { order: state.order },
        })
    })

    cy.intercept('GET', `**/businesses/orders/${orderId}`, (request) => {
        request.alias = 'getOrderFromStream'
        expect(state.postedId).to.eq(orderId)
        state.orderVisibleInList = true
        request.reply({ statusCode: 200, body: { order: state.order } })
    })
}

describe('Órdenes en tiempo real por SSE', () => {
    it('reconecta, recibe la orden recién creada, la obtiene y actualiza la lista sin recargar', () => {
        const state: OrderState = {
            orderPosted: false,
            eventSent: false,
            orderVisibleInList: false,
            streamConnections: 0,
            postedId: null,
            order: null,
        }
        installOrderAndStreamApi(state)

        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.contains('h1', 'Pedidos').should('be.visible')
        cy.window().then((window) => {
            cy.stub(window.HTMLMediaElement.prototype, 'play').as('orderAudioPlay')
        })

        cy.contains('button', '+ Nueva orden').click()
        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains(product.name).should('be.visible')
                cy.contains('button', 'Agregar al carrito').click()
                cy.contains('button', 'Continuar').click()
                cy.get('input[autocomplete="name"]').type('Cliente SSE Cypress')
                cy.get('input[autocomplete="tel"]').type('6691236382')
                cy.get('#restaurant-order-notes').type('Pedido de prueba del stream')
                cy.contains('button', 'Crear orden').click()
            })

        cy.wait('@createRestaurantOrder').then(({ request }) => {
            expect(request.body.customerName).to.eq('Cliente SSE Cypress')
            expect(state.postedId).to.eq(orderId)
        })
        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]').should('not.exist')

        cy.wait('@getOrderFromStream', { timeout: 15_000 }).then(({ request }) => {
            expect(request.url).to.contain(`/businesses/orders/${orderId}`)
        })
        cy.get('[role="status"]').should('not.exist')
        cy.get('@orderAudioPlay').should('not.have.been.called')
        cy.wait('@ordersList')

        cy.location('pathname').should('eq', '/dashboard/orders')
        cy.get('article')
            .should('have.length', 1)
            .and('contain', '#6382')
            .and('contain', 'Cliente Sse Cypress')
            .and('contain', 'Pendiente')
        cy.then(() => {
            expect(state.eventSent).to.eq(true)
            expect(state.orderVisibleInList).to.eq(true)
            expect(state.postedId).to.eq(orderId)
            expect(state.streamConnections).to.be.greaterThan(1)
        })
    })
})

export {}
