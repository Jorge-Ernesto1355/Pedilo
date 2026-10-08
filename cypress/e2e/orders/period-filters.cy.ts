export {}

const order = {
    id: 'order-period-filter-e2e',
    orderNumber: 1,
    customerId: null,
    subtotal: 95,
    total: 95,
    customerName: 'Cliente E2E',
    customerPhone: '6681234567',
    notes: null,
    items: [],
    statusHistory: [],
    createdAt: '2026-10-06T10:00:00.000Z',
    updatedAt: '2026-10-06T10:00:00.000Z',
}

function installPeriodApi() {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-period-filter-e2e',
            businessId: 'business-period-filter-e2e',
            currency: 'MXN',
            timezone: 'America/Mazatlan',
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? 1)
        const period = url.searchParams.get('period')
        const status = url.searchParams.get('status')
        const search = url.searchParams.get('search')

        const limit = url.searchParams.get('limit')
        expect(['5', '20']).to.include(limit)
        if (period) expect(['today', '7d', '30d', 'lastMonth']).to.include(period)
        if (status) expect(['PENDING', 'PREPARING', 'READY', 'CANCELLED']).to.include(status)
        expect(url.searchParams.has('CONFIRMED')).to.eq(false)

        request.alias = limit === '20' ? 'filteredOrders' : 'dashboardOrders'
        request.reply({
            statusCode: 200,
            body: {
                orders: [
                    {
                        ...order,
                        orderNumber: page,
                        status: status ?? 'PENDING',
                        customerName: search ? `Cliente ${search}` : order.customerName,
                    },
                ],
                page,
                limit: 20,
                total: 41,
            },
        })
    })

    cy.intercept('GET', '**/businesses/orders/order-period-filter-e2e', {
        statusCode: 200,
        body: { order },
    }).as('orderDetail')
}

describe('Filtros de periodo de órdenes', () => {
    beforeEach(() => {
        cy.login()
        cy.then(installPeriodApi)
        cy.visit('/dashboard/orders')
        cy.wait('@filteredOrders')
    })

    it('muestra los periodos y envía sus valores exactos al backend', () => {
        const periods = [
            { value: 'today', label: 'Hoy' },
            { value: '7d', label: 'Últimos 7 días' },
            { value: '30d', label: 'Últimos 30 días' },
            { value: 'lastMonth', label: 'Último mes' },
        ]

        const periodSelector = 'select[aria-label="Filtrar pedidos por periodo"]'

        periods.forEach(({ value, label }) => {
            cy.get(periodSelector).find(`option[value="${value}"]`).should('contain', label)
            cy.get(periodSelector).select(value)
            cy.get(periodSelector).should('have.value', value)
            cy.wait('@filteredOrders').its('request.url').should('include', `period=${value}`)
        })

        cy.get('select[aria-label="Filtrar pedidos por estado"] option').should(
            'not.contain',
            'CONFIRMED',
        )
    })

    it('reinicia la página y conserva todos los filtros combinados', () => {
        cy.get('button[aria-current="page"]').should('contain', '1')
        cy.contains('button', /^2$/).click()
        cy.wait('@filteredOrders').its('request.url').should('include', 'page=2')

        cy.get('select[aria-label="Filtrar pedidos por periodo"]').select('lastMonth')
        cy.wait('@filteredOrders')
            .its('request.url')
            .then((url) => {
                expect(url).to.include('period=lastMonth')
                expect(url).to.include('page=1')
            })

        cy.get('select[aria-label="Filtrar pedidos por estado"]').select('READY')
        cy.wait('@filteredOrders')
            .its('request.url')
            .then((url) => {
                expect(url).to.include('period=lastMonth')
                expect(url).to.include('status=READY')
                expect(url).to.include('page=1')
            })

        cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').type('29')
        cy.wait(400)
        cy.wait('@filteredOrders')
            .its('request.url')
            .then((url) => {
                expect(url).to.include('period=lastMonth')
                expect(url).to.include('status=READY')
                expect(url).to.include('search=29')
                expect(url).to.include('page=1')
                expect(url).to.include('limit=20')
            })
    })
})
