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
            percentage_change: 25 as number | null,
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

function averageTicketResponse({
    previousOrders = 2,
    percentage = 25,
}: { previousOrders?: number; percentage?: number | null } = {}) {
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

function trendResponseFromSales(period: SalesPeriod, sales: ReturnType<typeof salesResponse>) {
    return {
        period,
        granularity: sales.granularity,
        timezone: sales.timezone,
        trend: sales.trend,
        points: sales.points.map((point) => ({ ...point, start: point.start ?? '' })),
        series: {
            current: sales.series.current.map((point) => ({
                label: point.label,
                start: '',
                sales: Number(point.sales),
                orderCount: point.orders_count,
            })),
            previous: sales.series.previous.map((point) => ({
                label: point.label,
                start: '',
                sales: Number(point.sales),
                orderCount: point.orders_count,
            })),
        },
        comparison: {
            status: sales.comparison.status,
            percentage_change: sales.comparison.percentage_change,
            difference: Number(sales.comparison.difference),
            current_total: Number(sales.comparison.current_total),
            previous_total: Number(sales.comparison.previous_total),
        },
        tooltip: sales.tooltip.map((point, index) => ({
            timestamp: sales.points[index]?.start ?? '',
            label: point.label ?? '',
            current_sales: Number(point.current?.sales ?? 0),
            previous_sales: Number(point.previous?.sales ?? 0),
            difference: Number(point.difference ?? 0),
            percentage_change: point.percentage_change ?? null,
            current_orders_count: point.current?.orders_count ?? 0,
            previous_orders_count: point.previous?.orders_count ?? 0,
            status: point.previous?.sales === '0.00' ? 'NO_BASELINE' : 'OK',
        })),
    }
}

function setupSalesPage({
    salesStatus = 200,
    averageStatus = 200,
    trendStatus = 200,
    historicalStatus = 200,
    averageBody = averageTicketResponse(),
    historicalBody = { historicalSales: 9876.5, historicalOrderCount: 42 },
    salesBody,
    trendBody,
}: {
    salesStatus?: number | ((attempt: number) => number)
    averageStatus?: number | ((attempt: number) => number)
    trendStatus?: number | ((attempt: number) => number)
    historicalStatus?: number | ((attempt: number) => number)
    averageBody?: unknown
    historicalBody?: unknown
    salesBody?: unknown | ((period: SalesPeriod) => unknown)
    trendBody?: unknown | ((period: SalesPeriod) => unknown)
} = {}) {
    cy.intercept('GET', '**/api/v1/businesses/settings', {
        statusCode: 200,
        body: settings,
    }).as('businessSettings')

    let salesAttempts = 0
    cy.intercept('GET', '**/api/v1/dashboard/sales*', (request) => {
        salesAttempts += 1
        const period = String(request.query.period ?? 'today') as SalesPeriod
        const status = typeof salesStatus === 'function' ? salesStatus(salesAttempts) : salesStatus
        const body =
            typeof salesBody === 'function'
                ? salesBody(period)
                : (salesBody ?? salesResponse(period))
        request.reply({
            statusCode: status,
            body: status === 200 ? body : { message: 'Sales unavailable' },
        })
    }).as('dashboardSales')

    let trendAttempts = 0
    cy.intercept('GET', '**/api/v1/dashboard/trend*', (request) => {
        trendAttempts += 1
        const period = String(request.query.period ?? 'today') as SalesPeriod
        const status = typeof trendStatus === 'function' ? trendStatus(trendAttempts) : trendStatus
        const sales = bodyForPeriod(salesBody, period)
        request.reply({
            statusCode: status,
            body:
                status === 200
                    ? typeof trendBody === 'function'
                        ? trendBody(period)
                        : (trendBody ?? trendResponseFromSales(period, sales))
                    : { message: 'Trend unavailable' },
        })
    }).as('dashboardTrend')

    let historicalAttempts = 0
    cy.intercept('GET', '**/api/v1/dashboard/historical-sales*', (request) => {
        historicalAttempts += 1
        const status =
            typeof historicalStatus === 'function'
                ? historicalStatus(historicalAttempts)
                : historicalStatus
        request.reply({
            statusCode: status,
            body: status === 200 ? historicalBody : { message: 'Historical sales unavailable' },
        })
    }).as('historicalSales')

    let averageAttempts = 0
    cy.intercept('GET', '**/api/v1/analytics/average-ticket*', (request) => {
        averageAttempts += 1
        const status =
            typeof averageStatus === 'function' ? averageStatus(averageAttempts) : averageStatus
        request.reply({
            statusCode: status,
            body: status === 200 ? averageBody : { message: 'Average ticket unavailable' },
        })
    }).as('averageTicket')
}

function bodyForPeriod(
    salesBody: unknown | ((period: SalesPeriod) => unknown),
    period: SalesPeriod,
) {
    const body = typeof salesBody === 'function' ? salesBody(period) : salesBody
    return (body ?? salesResponse(period)) as ReturnType<typeof salesResponse>
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
        cy.wait('@dashboardTrend').its('request.query.period').should('eq', 'today')
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
            cy.wait('@dashboardTrend').its('request.query.period').should('eq', value)
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
        cy.contains('Tendencia').should('be.visible')
    })

    it('muestra el estado de error del ticket promedio', () => {
        setupSalesPage({ averageStatus: 500 })
        cy.visit('/dashboard/sales')
        cy.wait('@averageTicket')
        cy.contains('Ticket promedio no disponible', { timeout: 30_000 }).should('be.visible')
        cy.contains('Tendencia').should('be.visible')
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

    it('renderiza cada fila de ventas con su importe y número de órdenes', () => {
        setupSalesPage()
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')

        cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
        cy.get('tbody tr').should('have.length', 3)
        cy.get('tbody').within(() => {
            cy.contains('09:00').should('be.visible')
            cy.contains('$300.00').should('be.visible')
            cy.contains('11:00').should('be.visible')
            cy.contains('$600.00').should('be.visible')
        })
        cy.get('[aria-label="Indicadores secundarios"]').within(() => {
            cy.contains('3').should('be.visible')
        })
    })

    it('explica cómo se calculan ventas, tendencia y ticket promedio', () => {
        setupSalesPage()
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Cómo se compara este porcentaje"]').click()
        cy.contains('¿Contra qué se compara?').should('be.visible')
        cy.contains('Hoy: contra el día anterior.').should('be.visible')
        cy.get('[aria-label="Cómo se compara este porcentaje"]').click()
        cy.contains('¿Contra qué se compara?').should('not.exist')

        cy.get('[aria-label="Qué significa tendencia"]').click()
        cy.contains('Es el cambio porcentual de tus ventas').should('be.visible')
        cy.get('[aria-label="Qué significa tendencia"]').click()

        cy.get('[aria-label="Cómo se mide el ticket promedio"]').click()
        cy.contains('¿Cómo se mide el ticket promedio?').should('be.visible')
        cy.contains('Solo considera pedidos PREPARING y READY.').should('be.visible')
    })

    it('representa correctamente una caída y un ticket promedio menor', () => {
        const sales = salesResponse()
        sales.total = 600
        sales.previousTotal = 900
        sales.trend = -33
        sales.averageTicket = 200
        sales.comparison = {
            ...sales.comparison,
            percentage_change: -33,
            difference: '-300.00',
            current_total: '600.00',
            previous_total: '900.00',
        }
        const averageTicket = averageTicketResponse()
        averageTicket.data.current = {
            total_sales: '600.00',
            orders_count: 3,
            average_ticket: '200.00',
        }
        averageTicket.data.previous = {
            total_sales: '900.00',
            orders_count: 3,
            average_ticket: '300.00',
        }
        averageTicket.data.comparison = {
            difference: '-100.00',
            percentage_change: -33,
            direction: 'down',
            has_previous_data: true,
        }

        setupSalesPage({ salesBody: sales, averageBody: averageTicket })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Métricas de ventas"]').within(() => {
            cy.contains('$600.00').should('be.visible')
            cy.contains('-33%').should('be.visible')
            cy.contains('$200.00').should('be.visible')
            cy.contains('-33% contra el periodo anterior').should('be.visible')
            cy.contains('$300.00').should('be.visible')
        })
    })

    it('distingue una tendencia estable y un ticket sin cambio', () => {
        const sales = salesResponse()
        sales.trend = 0
        sales.comparison = {
            ...sales.comparison,
            percentage_change: 0,
            difference: '0.00',
        }
        const averageTicket = averageTicketResponse()
        averageTicket.data.previous = { ...averageTicket.data.current }
        averageTicket.data.comparison = {
            difference: '0.00',
            percentage_change: 0,
            direction: 'flat',
            has_previous_data: true,
        }

        setupSalesPage({ salesBody: sales, averageBody: averageTicket })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Métricas de ventas"]').within(() => {
            cy.contains('0%').should('be.visible')
            cy.contains('0% contra el periodo anterior').should('be.visible')
        })
    })

    it('muestra crecimiento nuevo cuando no existe periodo anterior', () => {
        const sales = salesResponse()
        sales.previousTotal = 0
        sales.trend = 0
        sales.comparison = {
            ...sales.comparison,
            status: 'NO_BASELINE',
            percentage_change: null,
            difference: '900.00',
            previous_total: '0.00',
        }
        const averageTicket = averageTicketResponse({ previousOrders: 0, percentage: null })
        averageTicket.data.comparison.direction = 'up'
        averageTicket.data.comparison.percentage_change = null

        setupSalesPage({ salesBody: sales, averageBody: averageTicket })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.get('[aria-label="Métricas de ventas"]').within(() => {
            cy.contains('+900%').should('be.visible')
            cy.contains('Nuevo crecimiento').should('be.visible')
            cy.contains('Sin periodo anterior comparable').should('be.visible')
        })
    })

    it('muestra ceros de forma segura cuando no hay ventas ni pedidos', () => {
        const sales = salesResponse()
        sales.total = 0
        sales.previousTotal = 0
        sales.ordersCount = 0
        sales.averageTicket = 0
        sales.points = sales.points.map((point) => ({ ...point, sales: 0, orderCount: 0 }))
        sales.comparison = {
            ...sales.comparison,
            percentage_change: 0,
            difference: '0.00',
            current_total: '0.00',
            previous_total: '0.00',
        }
        const averageTicket = averageTicketResponse({ previousOrders: 0, percentage: 0 })
        averageTicket.data.current = {
            total_sales: '0.00',
            orders_count: 0,
            average_ticket: '0.00',
        }
        averageTicket.data.global.average_ticket = '0.00'
        averageTicket.data.comparison.direction = 'flat'
        averageTicket.data.comparison.difference = '0.00'

        setupSalesPage({ salesBody: sales, averageBody: averageTicket })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')

        cy.contains('$0.00').should('be.visible')
        cy.contains('NaN').should('not.exist')
        cy.contains('Infinity').should('not.exist')
        cy.get('[aria-label="Indicadores secundarios"]').within(() => {
            cy.contains('0').should('be.visible')
        })
    })

    it('permite reintentar ventas y ticket promedio después de un error', () => {
        setupSalesPage({
            // React Query retries failed requests three times before exposing the error state.
            // Keep those attempts failing so the retry button is actually rendered; the manual
            // retry (attempt five) then succeeds.
            salesStatus: (attempt) => (attempt <= 4 ? 500 : 200),
            averageStatus: (attempt) => (attempt <= 4 ? 500 : 200),
        })
        cy.visit('/dashboard/sales')
        cy.wait('@dashboardSales')
        cy.wait('@averageTicket')
        cy.contains('Ventas no disponibles', { timeout: 30_000 }).should('be.visible')
        cy.contains('Ticket promedio no disponible', { timeout: 30_000 }).should('be.visible')

        cy.contains('Ventas no disponibles', { timeout: 30_000 }).parent().find('button').click()
        cy.wait('@dashboardSales').then(({ response }) => {
            expect(response?.statusCode).to.eq(200)
            expect(response?.body.total).to.eq(900)
        })
        cy.get('[aria-label="Métricas de ventas"]')
            .contains('$900.00', { timeout: 30_000 })
            .should('be.visible')
        cy.contains('Ticket promedio no disponible', { timeout: 30_000 })
            .parent()
            .find('button')
            .click()
        cy.wait('@averageTicket')
        cy.get('[aria-label="Métricas de ventas"]')
            .contains('$300.00', { timeout: 30_000 })
            .should('be.visible')
    })

    it('muestra el error de tendencia sin ocultar ventas ni ticket promedio', () => {
        setupSalesPage({ trendStatus: 500 })
        cy.visit('/dashboard/sales')
        cy.contains('Tendencia no disponible', { timeout: 30_000 }).should('be.visible')
        cy.contains('Ganancias del periodo').should('be.visible')
        cy.contains('Ticket promedio del periodo').should('be.visible')
    })

    it('muestra y puede reintentar las ventas históricas sin afectar ventas', () => {
        setupSalesPage({ historicalStatus: (attempt) => (attempt <= 4 ? 500 : 200) })
        cy.visit('/dashboard/sales')
        cy.contains('Ventas históricas no disponibles', { timeout: 30_000 }).should('be.visible')
        cy.wait('@historicalSales')
        cy.wait('@historicalSales')
        cy.wait('@historicalSales')
        cy.wait('@historicalSales')
        cy.contains('Ganancias del periodo').should('be.visible')

        cy.contains('Ventas históricas no disponibles').parent().find('button').click()
        cy.wait('@historicalSales').its('response.statusCode').should('eq', 200)
        cy.contains('$9,876.50', { timeout: 30_000 }).should('be.visible')
        cy.contains('42 pedidos acumulados').should('be.visible')
        cy.get('@dashboardSales.all').should('have.length', 1)
    })

    it('reintenta únicamente la consulta de tendencia', () => {
        setupSalesPage({ trendStatus: (attempt) => (attempt <= 4 ? 500 : 200) })
        cy.visit('/dashboard/sales')
        cy.contains('Tendencia no disponible', { timeout: 30_000 }).should('be.visible')
        cy.get('@dashboardTrend.all').should('have.length', 4)

        cy.contains('Tendencia no disponible').parent().find('button').click()
        cy.wait('@dashboardTrend').its('response.statusCode').should('eq', 200)
        cy.get('[aria-label="Comparación visual de ventas"]', { timeout: 30_000 }).should(
            'be.visible',
        )
        cy.get('@dashboardSales.all').should('have.length', 1)
        cy.get('@averageTicket.all').should('have.length', 1)
    })
})

export {}
