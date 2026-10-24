type Period = 'today' | '7d' | '30d' | 'thisMonth'

type SeedManifest = {
    timezone: string
    businessId: string
    orders: Array<{
        orderNumber: number
        status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'
        total: number
        cancelled: boolean
    }>
    expected: Record<
        Period,
        { total: number; orders: number; previousTotal: number; previousOrders: number }
    >
}

const periodLabels: Record<Period, string> = {
    today: 'Hoy',
    '7d': '7 días',
    '30d': '30 días',
    thisMonth: 'Este mes',
}

function loadManifest() {
    return cy.readFile<SeedManifest>('test-results/dashboard-seed-manifest.json')
}

function installDashboardSpies() {
    ;(['today', '7d', '30d', 'thisMonth'] as Period[]).forEach((period) => {
        const averagePeriod = period === 'thisMonth' ? 'this_month' : period
        cy.intercept({
            method: 'GET',
            url: '**/api/v1/dashboard/sales*',
            query: { period },
        }).as(`dashboardSales-${period}`)
        cy.intercept({
            method: 'GET',
            url: '**/api/v1/dashboard/trend*',
            query: { period },
        }).as(`dashboardTrend-${period}`)
        cy.intercept({
            method: 'GET',
            url: '**/api/v1/analytics/average-ticket*',
            query: { period: averagePeriod },
        }).as(`averageTicket-${period}`)
    })
}

function assertSalesPeriod(period: Period, manifest: SeedManifest) {
    const expected = manifest.expected[period]

    cy.wait(`@dashboardSales-${period}`).then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('period')).to.eq(period)
        expect(response?.statusCode).to.eq(200)
        expect(response?.body.timezone).to.eq(manifest.timezone)
        expect(response?.body.total).to.eq(expected.total)
        expect(response?.body.ordersCount).to.eq(expected.orders)
        expect(response?.body.points).to.be.an('array')
    })
    cy.wait(`@averageTicket-${period}`).then(({ request, response }) => {
        const expectedPeriod = period === 'thisMonth' ? 'this_month' : period
        expect(new URL(request.url).searchParams.get('period')).to.eq(expectedPeriod)
        expect(response?.statusCode).to.eq(200)
        expect(Number(response?.body.data.current.total_sales)).to.eq(expected.total)
        expect(response?.body.data.current.orders_count).to.eq(expected.orders)
    })
    cy.wait(`@dashboardTrend-${period}`).then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('period')).to.eq(period)
        expect(response?.statusCode).to.eq(200)
        expect(response?.body.timezone).to.eq(manifest.timezone)
        expect(response?.body.series.current).to.be.an('array')
        expect(response?.body.series.previous).to.be.an('array')
        expect(response?.body.tooltip).to.be.an('array')
    })
    cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
    cy.contains(periodLabels[period]).should('be.visible')
}

describe('Dashboard · datos históricos sembrados', () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error('Ejecuta npm run e2e:seed:dashboard antes de esta suite.')
            }
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
    })

    it('recalcula ventas, ticket y tendencia por periodo', () => {
        installDashboardSpies()
        cy.visit('/dashboard/sales')
        loadManifest().then((manifest) => {
            assertSalesPeriod('today', manifest)
            ;(['7d', '30d', 'thisMonth'] as Period[]).forEach((period) => {
                cy.get(`[aria-label="Periodo de ventas"] button[data-value="${period}"]`).click()
                assertSalesPeriod(period, manifest)
            })
        })
    })

    it('excluye cancelados de ventas y conserva los estados en pedidos', () => {
        cy.intercept('GET', '**/api/v1/dashboard/sales*').as('dashboardSales')
        cy.intercept('GET', '**/businesses/*/orders*').as('orders')
        cy.visit('/dashboard')
        loadManifest().then((manifest) => {
            cy.wait('@dashboardSales').then(({ response }) => {
                const expected = manifest.expected.today
                expect(response?.body.total).to.eq(expected.total)
                expect(response?.body.ordersCount).to.eq(expected.orders)
                expect(
                    manifest.orders.filter((order) => order.status === 'CANCELLED').length,
                ).to.be.greaterThan(0)
            })
            cy.wait('@orders').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.orders).to.be.an('array')
            })
        })
        cy.contains('h2', 'Cómo te fue').should('be.visible')
        cy.contains('h2', 'Lo más vendido').should('be.visible')
        cy.contains('h2', 'Cómo va tu negocio').should('be.visible')
        cy.contains('h2', 'Pedidos recientes').should('be.visible')
    })

    it('permite filtrar pedidos cancelados sin alterar las métricas de ventas', () => {
        cy.intercept('GET', '**/businesses/*/orders*').as('ordersInitial')
        cy.intercept({
            method: 'GET',
            url: '**/businesses/*/orders*',
            query: { status: 'CANCELLED' },
        }).as('cancelledOrders')
        cy.visit('/dashboard/orders')
        cy.wait('@ordersInitial')
        cy.get('select[aria-label="Filtrar pedidos por estado"]').select('CANCELLED')
        cy.wait('@cancelledOrders').then(({ request, response }) => {
            expect(request.url).to.include('status=CANCELLED')
            expect(response?.body.orders).to.be.an('array')
            response?.body.orders.forEach((order: { status: string }) => {
                expect(order.status).to.eq('CANCELLED')
            })
        })
    })
})

export {}
