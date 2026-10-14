type SalesPeriod = 'today' | '7d' | '30d' | 'thisMonth'

const averageTicketPeriod: Record<SalesPeriod, string> = {
    today: 'today',
    '7d': '7d',
    '30d': '30d',
    thisMonth: 'this_month',
}

const settings = {
    id: 'settings-sales-analytics',
    businessId: 'business-sales-analytics',
    currency: 'MXN',
    phone: null,
    whatsapp: null,
    address: null,
    timezone: 'America/Mazatlan',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
}

function salesResponse(period: SalesPeriod = 'today') {
    return {
        period,
        granularity: period === 'today' ? 'hour' : 'day',
        timezone: 'America/Mazatlan',
        total: 900,
        previousTotal: 720,
        ordersCount: 3,
        trend: 25,
        averageTicket: 300,
        points: [
            { label: '09:00', start: '2026-10-13T15:00:00.000Z', sales: 300, orderCount: 1 },
            { label: '10:00', start: '2026-10-13T16:00:00.000Z', sales: 0, orderCount: 0 },
            { label: '11:00', start: '2026-10-13T17:00:00.000Z', sales: 600, orderCount: 2 },
        ],
        series: {
            current: [
                { label: '09:00', sales: 300, orders_count: 1 },
                { label: '10:00', sales: 0, orders_count: 0 },
                { label: '11:00', sales: 600, orders_count: 2 },
            ],
            previous: [
                { label: '09:00', sales: 240, orders_count: 1 },
                { label: '10:00', sales: 0, orders_count: 0 },
                { label: '11:00', sales: 480, orders_count: 2 },
            ],
        },
        comparison: {
            status: 'OK',
            percentage_change: 25,
            difference: '180.00',
            current_total: '900.00',
            previous_total: '720.00',
        },
        tooltip: [
            {
                label: '09:00',
                current: { sales: '300.00', orders_count: 1 },
                previous: { sales: '240.00', orders_count: 1 },
                difference: '60.00',
                percentage_change: 25,
            },
            {
                label: '10:00',
                current: { sales: '0.00', orders_count: 0 },
                previous: { sales: '0.00', orders_count: 0 },
                difference: '0.00',
                percentage_change: null,
            },
            {
                label: '11:00',
                current: { sales: '600.00', orders_count: 2 },
                previous: { sales: '480.00', orders_count: 2 },
                difference: '120.00',
                percentage_change: 25,
            },
        ],
    }
}

function averageTicketResponse({ previousOrders = 2, percentage = 25 } = {}) {
    return {
        data: {
            metric: 'average_ticket',
            period: 'today',
            currency: 'MXN',
            current: {
                total_sales: '900.00',
                orders_count: 3,
                average_ticket: '300.00',
            },
            previous: {
                total_sales: previousOrders ? '600.00' : '0.00',
                orders_count: previousOrders,
                average_ticket: previousOrders ? '240.00' : '0.00',
            },
            global: {
                total_sales: '57035.00',
                orders_count: 3,
                average_ticket: '19011.67',
            },
            comparison: {
                difference: previousOrders ? '60.00' : '300.00',
                percentage_change: percentage,
                direction: 'up',
                has_previous_data: Boolean(previousOrders),
            },
            meta: {
                timezone: 'America/Mazatlan',
                generated_at: '2026-10-13T18:00:00.000Z',
            },
        },
    }
}

function setupSalesPage({
    salesStatus = 200,
    averageStatus = 200,
    averageBody = averageTicketResponse(),
}: {
    salesStatus?: number
    averageStatus?: number
    averageBody?: unknown
} = {}) {
    cy.intercept('GET', '**/api/v1/businesses/settings', {
        statusCode: 200,
        body: settings,
    }).as('businessSettings')

    cy.intercept('GET', '**/api/v1/dashboard/sales*', (request) => {
        const period = String(request.query.period ?? 'today') as SalesPeriod
        request.reply({
            statusCode: salesStatus,
            body: salesStatus === 200 ? salesResponse(period) : { message: 'Sales unavailable' },
        })
    }).as('dashboardSales')

    cy.intercept('GET', '**/api/v1/analytics/average-ticket*', (request) => {
        request.reply({
            statusCode: averageStatus,
            body: averageStatus === 200 ? averageBody : { message: 'Average ticket unavailable' },
        })
    }).as('averageTicket')
}

describe('Ventas · analítica comparativa', () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error(
                    'Ejecuta npm run e2e:seed antes de probar las analíticas de ventas.',
                )
            }

            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
    })

    it('muestra ventas, porcentaje, ticket promedio, promedio global y tendencia', () => {
        setupSalesPage()
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales').its('request.query.period').should('eq', 'today')
        cy.wait('@averageTicket').its('request.query.period').should('eq', 'today')

        cy.get('[aria-label="Métricas de ventas"]').within(() => {
            cy.contains('Ganancias del periodo').should('be.visible')
            cy.contains('$900.00').should('be.visible')
            cy.contains('Tendencia').should('be.visible')
            cy.contains('+25%').should('be.visible')
            cy.get('[aria-label="Comparación visual de ventas"]').should('be.visible')
            cy.contains('Actual').should('be.visible')
            cy.contains('Anterior').should('be.visible')
            cy.contains('Ticket promedio del periodo').should('be.visible')
            cy.contains('$300.00').should('be.visible')
            cy.contains('Promedio histórico').should('be.visible')
            cy.contains('$19,011.67').should('be.visible')
        })

        cy.get('[aria-label^="Gráfica de ventas por"]').should('be.visible')
        cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
    })

    it('envía el periodo seleccionado a ventas y ticket promedio en los cuatro filtros', () => {
        setupSalesPage()
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        const periods: Array<{ value: SalesPeriod; label: string }> = [
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: 'thisMonth', label: 'Este mes' },
            { value: 'today', label: 'Hoy' },
        ]

        periods.forEach(({ value, label }) => {
            cy.get('[aria-label="Periodo de ventas"]')
                .find(`button[role="radio"][data-value="${value}"]`)
                .should('contain', label)
                .should('be.visible')
                .click()
            cy.wait('@dashboardSales').its('request.query.period').should('eq', value)
            cy.wait('@averageTicket')
                .its('request.query.period')
                .should('eq', averageTicketPeriod[value])
            cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
        })
    })

    it('muestra crecimiento del ticket cuando el periodo anterior tiene cero pedidos', () => {
        setupSalesPage({
            averageBody: averageTicketResponse({ previousOrders: 0, percentage: 300 }),
        })
        cy.visit('/dashboard/sales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Métricas de ventas"]').within(() => {
            cy.contains('+300% contra el periodo anterior').should('be.visible')
            cy.contains('Sin periodo anterior comparable').should('not.exist')
            cy.contains('$300.00').should('be.visible')
            cy.contains('$19,011.67').should('be.visible')
        })
    })

    it('conserva los intervalos sin ventas en la mini gráfica', () => {
        setupSalesPage()
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')

        cy.get('[aria-label="Comparación visual de ventas"]').should('be.visible')
        cy.get('[aria-label^="Gráfica de ventas por"]').should('be.visible')
    })

    it('muestra el estado de error de ventas sin ocultar la página', () => {
        setupSalesPage({ salesStatus: 500 })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.contains('Ventas no disponibles', { timeout: 30_000 }).should('be.visible')
        cy.contains('Gráfica de ventas no disponible', { timeout: 30_000 }).should('be.visible')
    })

    it('muestra el estado de error del ticket promedio', () => {
        setupSalesPage({ averageStatus: 500 })
        cy.visit('/dashboard/sales')
        cy.wait('@averageTicket')
        cy.contains('Ticket promedio no disponible', { timeout: 30_000 }).should('be.visible')
    })

    it('mantiene la composición usable en móvil', () => {
        setupSalesPage()
        cy.viewport(390, 844)
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
        cy.get('[aria-label="Comparación visual de ventas"]').should('be.visible')
        cy.get('body').then(($body) => {
            expect($body[0].scrollWidth).to.be.at.most(390)
        })
    })
})

export {}
