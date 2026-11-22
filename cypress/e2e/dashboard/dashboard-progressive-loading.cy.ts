describe('Dashboard · carga progresiva de módulos', { retries: 0 }, () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error('Ejecuta npm run e2e:seed antes de probar el dashboard.')
            }
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
        // loginWithApi deja cargado /dashboard: sus peticiones secundarias llegarían
        // después de registrar los intercepts y se contarían como del test.
        cy.visit('about:blank')
    })

    it('monta y consulta solo los módulos iniciales, y carga los demás al hacer scroll', () => {
        registerDashboardRequests()

        cy.visit('/dashboard')

        cy.wait(['@googleReviewsStats', '@storeVisitsStats'])

        cy.contains('p', 'Ganancias del periodo').should('be.visible')
        cy.contains('Ticket promedio del periodo').should('be.visible')
        // Ventas, ticket promedio e históricas de "Hoy" llegan en el HTML del servidor:
        // el navegador no debe repetir esas peticiones.
        cy.contains('pedidos acumulados').should('be.visible')
        assertRequestCount('@dashboardSales', 0)
        assertRequestCount('@historicalSales', 0)
        assertRequestCount('@averageTicket', 0)
        cy.get('#google-reviews-stats-title').should('be.visible')
        cy.get('#menu-visits-title').should('be.visible')

        // Los módulos diferidos aún conservan su fallback y no ejecutaron consultas.
        cy.contains('h2', 'Cómo te fue').should('not.exist')
        cy.contains('h2', 'Lo más vendido').should('not.exist')
        cy.contains('h2', 'Pedidos recientes').should('not.exist')
        assertRequestCount('@dashboardTrend', 0)
        assertRequestCount('@bestSellingProducts', 0)
        assertRequestCount('@recentOrders', 0)

        cy.get('[aria-label="Cargando módulo del dashboard"]').eq(0).scrollIntoView()
        cy.wait('@dashboardTrend')
        cy.contains('h2', 'Cómo te fue').should('be.visible')

        cy.scrollTo('bottom')
        cy.wait([
            '@bestSellingProducts',
            '@recentOrders',
        ])
        cy.contains('h2', 'Lo más vendido').should('be.visible')
        cy.contains('h2', 'Pedidos recientes').should('be.visible')
    })

    it('no repite montajes ni llamadas al volver a subir y bajar', () => {
        registerDashboardRequests('repeat')

        cy.visit('/dashboard')
        cy.wait(['@repeat-googleReviewsStats', '@repeat-storeVisitsStats'])
        cy.get('[aria-label="Cargando módulo del dashboard"]').eq(0).scrollIntoView()
        cy.wait('@repeat-dashboardTrend')
        cy.scrollTo('bottom')
        cy.wait([
            '@repeat-bestSellingProducts',
            '@repeat-recentOrders',
        ])

        // Los datos prioritarios vienen del servidor; el navegador no los pide.
        ;['@repeat-dashboardSales', '@repeat-historicalSales', '@repeat-averageTicket'].forEach(
            (alias) => assertRequestCount(alias, 0),
        )
        const aliases = [
            '@repeat-googleReviewsStats',
            '@repeat-storeVisitsStats',
            '@repeat-dashboardTrend',
            '@repeat-bestSellingProducts',
            '@repeat-recentOrders',
        ]
        cy.scrollTo('top')
        cy.wait(150)
        cy.scrollTo('bottom')
        cy.wait(150)
        aliases.forEach((alias) => assertRequestCount(alias, 1))
    })
})

function registerDashboardRequests(prefix = '') {
    const alias = (name: string) => (prefix ? `${prefix}-${name}` : name)
    cy.intercept('GET', '**/api/v1/dashboard/sales*').as(alias('dashboardSales'))
    cy.intercept('GET', '**/api/v1/dashboard/historical-sales*').as(alias('historicalSales'))
    cy.intercept('GET', '**/api/v1/analytics/average-ticket*').as(alias('averageTicket'))
    cy.intercept('GET', '**/api/v1/businesses/google-reviews/stats*').as(alias('googleReviewsStats'))
    cy.intercept('GET', '**/api/v1/businesses/store-visits/stats*').as(alias('storeVisitsStats'))
    cy.intercept('GET', '**/api/v1/dashboard/trend*').as(alias('dashboardTrend'))
    cy.intercept('GET', '**/api/v1/businesses/*/products/analytics/best-selling*').as(alias('bestSellingProducts'))
    cy.intercept('GET', '**/api/v1/businesses/*/orders*').as(alias('recentOrders'))
}

function assertRequestCount(alias: string, count: number) {
    cy.get(`${alias}.all`).then((requests) => {
        const interceptions = requests as unknown as Array<{ request: { url: string } }>
        const urls = interceptions.map((request) => request.request.url).join(' | ')
        expect(interceptions, `Número de llamadas para ${alias} (${urls})`).to.have.length(count)
    })
}

export {}
