type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'

const order = {
    id: 'order-page-states-e2e',
    orderNumber: 7001,
    customerId: 'customer-page-states-e2e',
    subtotal: 120,
    total: 120,
    customerName: 'Cliente Estados',
    customerPhone: '6695557001',
    notes: null,
    items: [],
    statusHistory: [],
    createdAt: '2026-10-28T18:00:00.000Z',
    updatedAt: '2026-10-28T18:00:00.000Z',
}

function installOrderApi({ empty = true, failMain = false } = {}) {
    let mainCalls = 0

    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-page-states-e2e',
            businessId: 'business-page-states-e2e',
            currency: 'MXN',
            timezone: 'America/Mazatlan',
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        const hasStatus = url.searchParams.has('status')
        const hasSearch = Boolean(url.searchParams.get('search'))
        if (!hasStatus && !hasSearch) {
            mainCalls += 1
            request.alias = mainCalls === 1 ? 'mainOrders' : mainCalls === 5 ? 'retryOrders' : undefined
            // React Query retries failed queries three times by default. Fail the
            // initial request plus those retries so the error state is observable;
            // the explicit UI retry is the fifth request and succeeds.
            if (failMain && mainCalls <= 4) {
                request.reply({ statusCode: 500, body: { error: { message: 'temporary failure' } } })
                return
            }
        }
        request.reply({
            statusCode: 200,
            body: {
                orders: empty ? [] : [{ ...order, status: 'PENDING' as OrderStatus }],
                page: 1,
                limit: 10,
                total: empty ? 0 : 1,
            },
        })
    })
}

describe('Página de pedidos · estados y recuperación', () => {
    beforeEach(() => cy.login())

    it('muestra el estado vacío con filtros, contadores y acción de nueva orden', () => {
        installOrderApi()
        cy.visit('/dashboard/orders')
        cy.wait('@mainOrders')

        cy.contains('h1', 'Pedidos').should('be.visible')
        cy.contains('h2', 'Aún no tienes pedidos').should('be.visible')
        cy.contains('Cuando tus clientes realicen un pedido').should('be.visible')
        cy.contains('button', '+ Nueva orden').should('be.visible')
        cy.contains('button', 'Todos').should('be.visible').and('contain', '0')
        cy.contains('#7001').should('not.exist')
    })

    it('muestra el estado vacío de búsqueda y permite limpiar el filtro', () => {
        installOrderApi()
        cy.visit('/dashboard/orders')
        cy.wait('@mainOrders')

        cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
            .type('sin resultados')
        cy.contains('h2', 'No encontramos pedidos').should('be.visible')
        cy.contains('Prueba con otro número, nombre o teléfono.').should('be.visible')
        cy.get('button[aria-label="Limpiar búsqueda"]').click()
        cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
            .should('have.value', '')
        cy.contains('h2', 'Aún no tienes pedidos').should('be.visible')
    })

    it('muestra error y recupera la lista al reintentar', () => {
        installOrderApi({ empty: false, failMain: true })
        cy.visit('/dashboard/orders')
        cy.wait('@mainOrders')
        cy.contains('[role="alert"]', 'No pudimos cargar tus pedidos').should('be.visible')
        cy.contains('button', 'Intentar de nuevo').click()
        cy.wait('@retryOrders')
        cy.get('article').should('contain', '#7001').and('be.visible')
        cy.contains('[role="alert"]', 'No pudimos cargar tus pedidos').should('not.exist')
    })
})

export {}
