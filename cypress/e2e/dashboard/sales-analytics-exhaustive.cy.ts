type Period = 'today' | '7d' | '30d' | 'thisMonth'
type Status = 'PREPARING' | 'READY' | 'CANCELLED'

type SimulatedOrder = {
    amount: number
    createdAt: string
    status: Status
    interval: 'current' | 'previous'
}

type Scenario = {
    current: { total: number; orders: number }
    previous: { total: number; orders: number }
    orders: SimulatedOrder[]
}

const averagePeriod: Record<Period, string> = {
    today: 'today',
    '7d': '7d',
    '30d': '30d',
    thisMonth: 'this_month',
}

const labels: Record<Period, string> = {
    today: 'Hoy',
    '7d': '7 días',
    '30d': '30 días',
    thisMonth: 'Este mes',
}

const settings = {
    id: 'settings-analytics-exhaustive',
    businessId: 'business-analytics-exhaustive',
    currency: 'MXN',
    timezone: 'America/Mazatlan',
}

function distribute(total: number, count: number) {
    if (count === 0) return []
    const base = Math.floor(total / count)
    return Array.from({ length: count }, (_, index) => base + (index < total % count ? 1 : 0))
}

function makeScenario(
    currentTotal: number,
    currentOrders: number,
    previousTotal: number,
    previousOrders: number,
): Scenario {
    const currentAmounts = distribute(currentTotal, currentOrders)
    const previousAmounts = distribute(previousTotal, previousOrders)
    const orders: SimulatedOrder[] = [
        ...currentAmounts.map((amount, index) => ({
            amount,
            createdAt: `2026-10-${String(13 - (index % 4)).padStart(2, '0')}T${String(8 + (index % 12)).padStart(2, '0')}:00:00.000Z`,
            status: (index % 2 ? 'READY' : 'PREPARING') as Status,
            interval: 'current' as const,
        })),
        ...previousAmounts.map((amount, index) => ({
            amount,
            createdAt: `2026-10-${String(6 - (index % 4)).padStart(2, '0')}T${String(8 + (index % 12)).padStart(2, '0')}:00:00.000Z`,
            status: (index % 2 ? 'READY' : 'PREPARING') as Status,
            interval: 'previous' as const,
        })),
    ]

    // Cancelled orders intentionally include small, medium, and large amounts. They must not
    // affect totals, order counts, averages, comparisons, or chart points.
    for (let index = orders.length; index < 100; index += 1) {
        orders.push({
            amount: [75, 450, 12_500][index % 3],
            createdAt: `2026-10-${String(1 + (index % 12)).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
            status: 'CANCELLED',
            interval: index % 2 ? 'current' : 'previous',
        })
    }

    return {
        current: summarize(orders, 'current'),
        previous: summarize(orders, 'previous'),
        orders,
    }
}

function summarize(orders: SimulatedOrder[], interval: SimulatedOrder['interval']) {
    const valid = orders.filter(
        (order) => order.interval === interval && order.status !== 'CANCELLED',
    )
    return {
        total: valid.reduce((sum, order) => sum + order.amount, 0),
        orders: valid.length,
    }
}

const scenarios: Record<Period, Scenario> = {
    today: makeScenario(12_000, 3, 10_000, 2),
    '7d': makeScenario(12_000, 20, 10_000, 15),
    '30d': makeScenario(8_000, 35, 10_000, 30),
    thisMonth: makeScenario(10_000, 25, 10_000, 25),
}

function percentage(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : null
    return Math.round(((current - previous) / previous) * 100)
}

function money(value: number) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function average(total: number, orders: number) {
    return orders === 0 ? '0.00' : (total / orders).toFixed(2)
}

function responseFor(period: Period, scenario: Scenario) {
    const current = distribute(scenario.current.total, 4)
    const previous = distribute(scenario.previous.total, 4)

    // Keep a shared empty interval in both series. The amount is moved to the
    // first interval so totals remain unchanged while the comparison for the
    // empty interval correctly has no percentage baseline.
    const currentEmptyInterval = current[1] ?? 0
    const previousEmptyInterval = previous[1] ?? 0
    current[0] += currentEmptyInterval
    previous[0] += previousEmptyInterval
    current[1] = 0
    previous[1] = 0

    const difference = scenario.current.total - scenario.previous.total
    const change = percentage(scenario.current.total, scenario.previous.total)
    const noBaseline = scenario.previous.total === 0 && scenario.current.total > 0

    return {
        period,
        granularity: period === 'today' ? 'hour' : 'day',
        timezone: 'America/Mazatlan',
        total: scenario.current.total,
        previousTotal: scenario.previous.total,
        ordersCount: scenario.current.orders,
        trend: change ?? 0,
        averageTicket:
            scenario.current.orders === 0 ? 0 : scenario.current.total / scenario.current.orders,
        points: current.map((sales, index) => ({
            label:
                period === 'today'
                    ? `${String(9 + index * 2).padStart(2, '0')}:00`
                    : `Día ${index + 1}`,
            sales,
            orderCount: 0,
        })),
        series: {
            current: current.map((sales, index) => ({
                label: String(index),
                sales,
                orders_count: index === 0 ? scenario.current.orders : 0,
            })),
            previous: previous.map((sales, index) => ({
                label: String(index),
                sales,
                orders_count: index === 0 ? scenario.previous.orders : 0,
            })),
        },
        comparison: {
            status: noBaseline ? 'NO_BASELINE' : 'OK',
            percentage_change: change,
            difference: difference.toFixed(2),
            current_total: scenario.current.total.toFixed(2),
            previous_total: scenario.previous.total.toFixed(2),
        },
        tooltip: current.map((sales, index) => ({
            label: String(index),
            current: {
                sales: sales.toFixed(2),
                orders_count: index === 0 ? scenario.current.orders : 0,
            },
            previous: {
                sales: previous[index].toFixed(2),
                orders_count: index === 0 ? scenario.previous.orders : 0,
            },
            difference: (sales - previous[index]).toFixed(2),
            percentage_change: previous[index] === 0 ? null : percentage(sales, previous[index]),
        })),
    }
}

function averageResponse(period: Period, scenario: Scenario) {
    const currentAverage = average(scenario.current.total, scenario.current.orders)
    const previousAverage = average(scenario.previous.total, scenario.previous.orders)
    const ticketChange = percentage(Number(currentAverage), Number(previousAverage))

    return {
        data: {
            metric: 'average_ticket',
            period: averagePeriod[period],
            currency: 'MXN',
            current: {
                total_sales: scenario.current.total.toFixed(2),
                orders_count: scenario.current.orders,
                average_ticket: currentAverage,
            },
            previous: {
                total_sales: scenario.previous.total.toFixed(2),
                orders_count: scenario.previous.orders,
                average_ticket: previousAverage,
            },
            global: {
                total_sales: scenario.current.total.toFixed(2),
                orders_count: scenario.current.orders,
                average_ticket: currentAverage,
            },
            comparison: {
                difference: (Number(currentAverage) - Number(previousAverage)).toFixed(2),
                percentage_change: ticketChange,
                direction:
                    Number(currentAverage) > Number(previousAverage)
                        ? 'up'
                        : Number(currentAverage) < Number(previousAverage)
                          ? 'down'
                          : 'flat',
                has_previous_data: scenario.previous.orders > 0,
            },
            meta: { timezone: 'America/Mazatlan', generated_at: '2026-10-13T18:00:00.000Z' },
        },
    }
}

function trendResponse(period: Period, scenario: Scenario) {
    const sales = responseFor(period, scenario)
    return {
        period,
        granularity: sales.granularity,
        timezone: sales.timezone,
        trend: sales.trend,
        points: sales.points.map((point, index) => ({
            ...point,
            start: `2026-10-${String(13 - (index % 4)).padStart(2, '0')}T00:00:00.000Z`,
        })),
        series: {
            current: sales.series.current.map((point, index) => ({
                label: point.label,
                start: `2026-10-${String(13 - (index % 4)).padStart(2, '0')}T00:00:00.000Z`,
                sales: point.sales,
                orderCount: point.orders_count,
            })),
            previous: sales.series.previous.map((point, index) => ({
                label: point.label,
                start: `2026-10-${String(6 - (index % 4)).padStart(2, '0')}T00:00:00.000Z`,
                sales: point.sales,
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
            timestamp: `2026-10-${String(13 - (index % 4)).padStart(2, '0')}T00:00:00.000Z`,
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

function installFixture({ scenarioByPeriod = scenarios, delaySlowPeriod = false } = {}) {
    cy.intercept('GET', '**/api/v1/businesses/settings', { statusCode: 200, body: settings })
    cy.intercept('GET', '**/api/v1/dashboard/sales*', (request) => {
        const period = String(request.query.period ?? 'today') as Period
        const scenario = scenarioByPeriod[period]
        if (delaySlowPeriod && period === '7d') {
            request.reply({ delay: 800, statusCode: 200, body: responseFor(period, scenario) })
            return
        }
        request.reply({ statusCode: 200, body: responseFor(period, scenario) })
    }).as('sales')
    cy.intercept('GET', '**/api/v1/dashboard/trend*', (request) => {
        const period = String(request.query.period ?? 'today') as Period
        request.reply({ statusCode: 200, body: trendResponse(period, scenarioByPeriod[period]) })
    }).as('trend')
    cy.intercept('GET', '**/api/v1/analytics/average-ticket*', (request) => {
        const period = String(request.query.period ?? 'today')
        const salesPeriod = Object.entries(averagePeriod).find(
            ([, value]) => value === period,
        )?.[0] as Period
        request.reply({
            statusCode: 200,
            body: averageResponse(salesPeriod, scenarioByPeriod[salesPeriod]),
        })
    }).as('ticket')
}

function selectPeriod(period: Period) {
    cy.get('[aria-label="Periodo de ventas"]').find(`button[data-value="${period}"]`).click()
}

function assertPeriod(period: Period, scenario: Scenario) {
    const expectedChange = percentage(scenario.current.total, scenario.previous.total)
    cy.wait('@sales').then(({ request, response }) => {
        expect(request.query.period).to.eq(period)
        expect(response?.body.total).to.eq(scenario.current.total)
        expect(
            response?.body.points.reduce(
                (sum: number, point: { sales: number }) => sum + point.sales,
                0,
            ),
        ).to.eq(scenario.current.total)
    })
    cy.wait('@ticket').then(({ request, response }) => {
        expect(request.query.period).to.eq(averagePeriod[period])
        expect(response?.body.data.current.average_ticket).to.eq(
            average(scenario.current.total, scenario.current.orders),
        )
    })
    cy.wait('@trend').then(({ request, response }) => {
        expect(request.query.period).to.eq(period)
        expect(response?.body.trend).to.eq(expectedChange ?? 0)
        expect(response?.body.series.current).to.be.an('array')
        expect(response?.body.series.previous).to.be.an('array')
    })
    cy.contains(money(scenario.current.total)).should('be.visible')
    cy.contains(money(Number(average(scenario.current.total, scenario.current.orders)))).should(
        'be.visible',
    )
    if (expectedChange === null) {
        cy.contains(`+${scenario.current.total.toLocaleString('en-US')}%`).should('be.visible')
        cy.contains('Nuevo crecimiento').should('be.visible')
    } else {
        cy.contains(`${expectedChange > 0 ? '+' : ''}${expectedChange}%`).should('be.visible')
    }
}

describe('Dashboard · auditoría exhaustiva de ventas, ticket y tendencia', () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword)
                throw new Error('Ejecuta npm run e2e:seed antes de esta suite.')
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
    })

    it('valida matemáticamente los cuatro periodos y excluye 100 pedidos cancelados simulados', () => {
        Object.values(scenarios).forEach((scenario) => {
            expect(scenario.orders).to.have.length(100)
            expect(summarize(scenario.orders, 'current').total).to.eq(scenario.current.total)
            expect(summarize(scenario.orders, 'previous').total).to.eq(scenario.previous.total)
        })
        installFixture()
        cy.visit('/dashboard/sales')
        assertPeriod('today', scenarios.today)
        ;(['7d', '30d', 'thisMonth'] as Period[]).forEach((period) => {
            selectPeriod(period)
            assertPeriod(period, scenarios[period])
            cy.get('[aria-label="Periodo de ventas"] button[aria-checked="true"]').should(
                'contain',
                labels[period],
            )
        })
    })

    it('mantiene las series alineadas, ceros y tooltips comparativos', () => {
        installFixture()
        cy.visit('/dashboard/sales')
        cy.wait('@sales').then(({ response }) => {
            const body = response?.body
            expect(body.series.current).to.have.length(4)
            expect(body.series.previous).to.have.length(4)
            expect(body.tooltip).to.have.length(4)
            expect(
                body.series.current
                    .map((point: { sales: number }) => point.sales)
                    .reduce((a: number, b: number) => a + b, 0),
            ).to.eq(body.comparison.current_total * 1)
            expect(body.series.current[1].sales).to.be.a('number')
            expect(body.tooltip[1].percentage_change).to.be.null
        })
        cy.get('[aria-label="Comparación visual de ventas"]').within(() => {
            cy.contains('Actual').should('be.visible')
            cy.contains('Anterior').should('be.visible')
        })
        cy.get('[aria-label^="Gráfica de ventas por"]').should('be.visible')
    })

    it('valida crecimiento, caída, igualdad, cero contra ventas y cero contra cero', () => {
        const cases = [
            { current: 12_000, previous: 10_000, expected: 20 },
            { current: 8_000, previous: 10_000, expected: -20 },
            { current: 10_000, previous: 10_000, expected: 0 },
            { current: 0, previous: 10_000, expected: -100 },
            { current: 5_000, previous: 0, expected: null },
            { current: 0, previous: 0, expected: 0 },
        ]
        cases.forEach(({ current, previous, expected }) => {
            const scenario = makeScenario(current, current ? 4 : 0, previous, previous ? 4 : 0)
            const body = responseFor('today', scenario)
            expect(body.comparison.percentage_change).to.eq(expected)
            expect(body.comparison.difference).to.eq((current - previous).toFixed(2))
        })
    })

    it('no mezcla resultados al cambiar rápidamente y conserva resultados al recargar', () => {
        installFixture({ delaySlowPeriod: true })
        cy.visit('/dashboard/sales')
        cy.wait('@sales')
        cy.wait('@ticket')
        selectPeriod('7d')
        selectPeriod('thisMonth')
        cy.wait('@sales').its('request.query.period').should('eq', '7d')
        cy.wait('@sales').its('request.query.period').should('eq', 'thisMonth')
        cy.wait('@ticket').its('request.query.period').should('eq', '7d')
        cy.wait('@ticket').its('request.query.period').should('eq', 'this_month')
        cy.contains(money(scenarios.thisMonth.current.total)).should('be.visible')
        cy.reload()
        assertPeriod('thisMonth', scenarios.thisMonth)
    })

    it('mantiene estados de error y ausencia de ventas sin NaN ni Infinity', () => {
        const empty = makeScenario(0, 0, 0, 0)
        installFixture({ scenarioByPeriod: { ...scenarios, today: empty } })
        cy.visit('/dashboard/sales')
        cy.wait('@sales')
        cy.wait('@ticket')
        cy.contains('$0.00').should('be.visible')
        cy.contains('NaN').should('not.exist')
        cy.contains('Infinity').should('not.exist')
        cy.get('[aria-label="Comparación visual de ventas"]').should('be.visible')
    })
})

export {}
