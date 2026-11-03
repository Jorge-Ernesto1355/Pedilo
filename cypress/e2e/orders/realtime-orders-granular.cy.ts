export {}

const businessId = 'business-realtime-granular-e2e'
const orderBase = {
    businessId,
    orderNumber: 701,
    status: 'PENDING',
    source: 'PUBLIC',
    fulfillmentType: 'PICKUP',
    customerId: null,
    subtotal: 149,
    discountAmount: 0,
    total: 149,
    customerName: 'Cliente SSE granular',
    customerPhone: '6681234567',
    notes: null,
    items: [
        {
            id: 'item-realtime-granular',
            productId: 'product-realtime-granular',
            productName: 'Hamburguesa SSE',
            quantity: 1,
            unitPrice: 149,
            subtotal: 149,
            options: [],
        },
    ],
    statusHistory: [{ status: 'PENDING', createdAt: '2026-11-02T18:00:00.000Z' }],
    createdAt: '2026-11-02T18:00:00.000Z',
    updatedAt: '2026-11-02T18:00:00.000Z',
}

type StreamMode = 'none' | 'public' | 'restaurant' | 'duplicate' | 'multiple' | 'status'

function order(id: string, source: 'PUBLIC' | 'RESTAURANT' = 'PUBLIC', number = 701) {
    return { ...orderBase, id, source, orderNumber: number }
}

function frameFor(item: ReturnType<typeof order>) {
    return `id: event-${item.id}\nevent: new_order\ndata: ${JSON.stringify({
        eventId: `event-${item.id}`,
        type: 'new_order',
        orderId: item.id,
        restaurantId: businessId,
        source: item.source,
        createdAt: item.createdAt,
    })}\n\n`
}

function installRealtimeApi(mode: StreamMode) {
    const first = order('order-realtime-granular-1')
    const second = order('order-realtime-granular-2', 'PUBLIC', 702)
    const manual = order('order-realtime-granular-manual', 'RESTAURANT', 703)
    const orders = new Map(
        [first, second, manual].map((item) => [item.id, item]),
    )
    let streamAttempt = 0
    let emit = false

    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: { id: 'settings-realtime-granular', businessId, currency: 'MXN', timezone: 'America/Mazatlan' },
    })
    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: { business: { id: businessId, slug: 'realtime-granular' } },
    })
    cy.intercept('GET', '**/businesses/*/customers*', {
        statusCode: 200,
        body: { customers: [], page: 1, limit: 10, total: 0 },
    })
    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const visible = emit
            ? mode === 'restaurant'
                ? [manual]
                : mode === 'public' || mode === 'duplicate' || mode === 'status'
                  ? [first]
                  : mode === 'multiple'
                    ? [first, second]
                    : []
            : []
        request.reply({
            statusCode: 200,
            body: { orders: visible, page: 1, limit: 20, total: visible.length },
        })
    }).as('ordersList')
    cy.intercept('GET', '**/businesses/orders/*', (request) => {
        const id = request.url.split('/').pop() ?? ''
        request.alias = 'getRealtimeOrder'
        request.reply({ statusCode: 200, body: { order: orders.get(id) ?? first } })
    })
    cy.intercept('GET', '**/api/orders/events', (request) => {
        streamAttempt += 1
        request.alias = 'orderEventsStream'
        if (!emit || streamAttempt === 1) {
            request.reply({ statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: ': connected\n\n' })
            return
        }
        let body = ''
        if (mode === 'public') body = frameFor(first)
        if (mode === 'restaurant') body = frameFor(manual)
        if (mode === 'duplicate') body = frameFor(first) + frameFor(first)
        if (mode === 'multiple') body = frameFor(first) + frameFor(second)
        if (mode === 'status') {
            body = `id: status-${first.id}\nevent: order_status_updated\ndata: ${JSON.stringify({
                eventId: `status-${first.id}`,
                type: 'order_status_updated',
                orderId: first.id,
                restaurantId: businessId,
                orderNumber: first.orderNumber,
                status: 'PREPARING',
                updatedAt: '2026-11-02T18:01:00.000Z',
                statusRevision: 1,
            })}\n\n`
        }
        request.reply({ statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body })
    })

    return {
        emit: () => {
            emit = true
        },
        first,
        second,
        manual,
    }
}

function visitAs(path: '/dashboard' | '/dashboard/orders' | '/dashboard/customers', mode: StreamMode) {
    const state = installRealtimeApi(mode)
    cy.login()
    cy.visit(path)
    cy.wait('@orderEventsStream')
    return state
}

describe('SSE de nuevas órdenes: escenarios granulares', () => {
    it('fuera de Pedidos muestra toast, incrementa badge y reproduce sonido para una orden pública', () => {
        const state = visitAs('/dashboard/customers', 'public')
        let playCalls = 0
        cy.window().then((window) => {
            window.localStorage.setItem(`pedilo:order-sound:${businessId}`, 'true')
            Object.keys(window.localStorage)
                .filter((key) => key.startsWith('pedilo:order-sound:'))
                .forEach((key) => window.localStorage.setItem(key, 'true'))
        })
        cy.reload()
        cy.wait('@orderEventsStream')
        cy.window().then((window) => {
            cy.stub(window.HTMLMediaElement.prototype, 'play').callsFake(() => {
                playCalls += 1
                return Promise.resolve()
            })
        })
        state.emit()
        cy.wait('@orderEventsStream')
        cy.wait('@getRealtimeOrder')
        cy.get('[role="status"]').should('contain', 'Nueva orden')
        cy.get('a[aria-label*="nuevas órdenes"]').should('contain', '1')
        cy.then(() => expect(playCalls).to.eq(1))
    })

    it('dentro de Pedidos actualiza la lista sin toast ni badge, pero reproduce sonido', () => {
        const state = installRealtimeApi('public')
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        let playCalls = 0
        cy.window().then((window) => {
            window.localStorage.setItem(`pedilo:order-sound:${businessId}`, 'true')
            Object.keys(window.localStorage)
                .filter((key) => key.startsWith('pedilo:order-sound:'))
                .forEach((key) => window.localStorage.setItem(key, 'true'))
        })
        cy.reload()
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        cy.window().then((window) => {
            cy.stub(window.HTMLMediaElement.prototype, 'play').callsFake(() => {
                playCalls += 1
                return Promise.resolve()
            })
        })
        state.emit()
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        cy.wait('@getRealtimeOrder')
        cy.get('article').should('contain', '#701').and('contain', 'Cliente')
        cy.get('[role="status"]').should('not.exist')
        cy.get('a[aria-label*="nuevas órdenes"]').should('not.exist')
        cy.then(() => expect(playCalls).to.eq(1))
    })

    it('una orden manual se sincroniza sin toast, badge ni sonido', () => {
        const state = installRealtimeApi('restaurant')
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        let playCalls = 0
        cy.window().then((window) => {
            window.localStorage.setItem(`pedilo:order-sound:${businessId}`, 'true')
            Object.keys(window.localStorage)
                .filter((key) => key.startsWith('pedilo:order-sound:'))
                .forEach((key) => window.localStorage.setItem(key, 'true'))
        })
        cy.reload()
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        cy.window().then((window) => {
            cy.stub(window.HTMLMediaElement.prototype, 'play').callsFake(() => {
                playCalls += 1
                return Promise.resolve()
            })
        })
        state.emit()
        cy.wait('@ordersList')
        cy.wait('@orderEventsStream')
        cy.wait('@getRealtimeOrder')
        cy.get('article').should('contain', '#703')
        cy.get('[role="status"]').should('not.exist')
        cy.get('a[aria-label*="nuevas órdenes"]').should('not.exist')
        cy.then(() => expect(playCalls).to.eq(0))
    })

    it('deduplica el mismo evento y conserva badge igual a uno', () => {
        const state = installRealtimeApi('duplicate')
        cy.login()
        cy.visit('/dashboard/customers')
        cy.wait('@orderEventsStream')
        state.emit()
        cy.reload()
        cy.wait('@orderEventsStream')
        cy.wait('@getRealtimeOrder')
        cy.get('a[aria-label*="nuevas órdenes"]').should('contain', '1')
        cy.get('[role="status"]').should('contain', 'Nueva orden')
    })

    it('procesa dos órdenes públicas y refleja ambas en badge y notificación', () => {
        const state = installRealtimeApi('multiple')
        cy.login()
        cy.visit('/dashboard/customers')
        cy.wait('@orderEventsStream')
        state.emit()
        cy.reload()
        cy.wait('@orderEventsStream')
        cy.wait('@getRealtimeOrder')
        cy.get('a[aria-label*="nuevas órdenes"]').should('contain', '2')
        cy.get('[role="status"]').should('contain', '2 nuevas órdenes')
    })

    it('un cambio de estado no produce sonido, toast ni badge de nueva orden', () => {
        const state = installRealtimeApi('status')
        cy.login()
        cy.visit('/dashboard/customers')
        cy.wait('@orderEventsStream')
        let playCalls = 0
        cy.reload()
        cy.wait('@orderEventsStream')
        cy.window().then((window) => {
            cy.stub(window.HTMLMediaElement.prototype, 'play').callsFake(() => {
                playCalls += 1
                return Promise.resolve()
            })
        })
        state.emit()
        cy.wait('@orderEventsStream')
        cy.get('[role="status"]').should('not.exist')
        cy.get('a[aria-label*="nuevas órdenes"]').should('not.exist')
        cy.then(() => expect(playCalls).to.eq(0))
    })
})
