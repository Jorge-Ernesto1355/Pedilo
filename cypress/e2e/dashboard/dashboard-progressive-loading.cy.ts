describe('Dashboard · carga progresiva de módulos', { retries: 0 }, () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error('Ejecuta npm run e2e:seed antes de probar el dashboard.')
            }
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
    })

    it('monta y consulta solo los módulos iniciales, y carga los demás al hacer scroll', () => {
        registerDashboardRequests()

        cy.visit('/dashboard')

        cy.wait([
            '@dashboardSales',
            '@historicalSales',
            '@averageTicket',
            '@googleReviewsStats',
            '@storeVisitsStats',
        ])

        cy.contains('p', 'Ganancias del periodo').should('be.visible')
        cy.contains('Ticket promedio del periodo').should('be.visible')
        cy.get('#google-reviews-stats-title').should('be.visible')
        cy.get('#menu-visits-title').should('be.visible')

        // Los módulos diferidos aún conservan su fallback y no ejecutaron consultas.
        cy.contains('h2', 'Cómo te fue').should('not.exist')
        cy.contains('h2', 'Lo más vendido').should('not.exist')
        cy.contains('h2', 'Cómo va tu negocio').should('not.exist')
        cy.contains('h2', 'Pedidos recientes').should('not.exist')
        assertRequestCount('@dashboardTrend', 0)
        assertRequestCount('@productStats', 0)
        assertRequestCount('@bestSellingProducts', 0)
        assertRequestCount('@mostRequestedProducts', 0)
        assertRequestCount('@productSummary', 0)
        assertRequestCount('@recentOrders', 0)

        cy.get('[aria-label="Cargando módulo del dashboard"]').eq(0).scrollIntoView()
        cy.wait('@dashboardTrend')
        cy.contains('h2', 'Cómo te fue').should('be.visible')

        cy.scrollTo('bottom')
        cy.wait([
            '@productStats',
            '@bestSellingProducts',
            '@mostRequestedProducts',
            '@productSummary',
            '@recentOrders',
        ])
        cy.contains('h2', 'Lo más vendido').should('be.visible')
        cy.contains('h2', 'Cómo va tu negocio').should('be.visible')
        cy.contains('h2', 'Pedidos recientes').should('be.visible')
    })

    it('no repite montajes ni llamadas al volver a subir y bajar', () => {
        registerDashboardRequests('repeat')

        cy.visit('/dashboard')
        cy.wait([
            '@repeat-dashboardSales',
            '@repeat-historicalSales',
            '@repeat-averageTicket',
            '@repeat-googleReviewsStats',
            '@repeat-storeVisitsStats',
        ])
        cy.get('[aria-label="Cargando módulo del dashboard"]').eq(0).scrollIntoView()
        cy.wait('@repeat-dashboardTrend')
        cy.scrollTo('bottom')
        cy.wait([
            '@repeat-productStats',
            '@repeat-bestSellingProducts',
            '@repeat-mostRequestedProducts',
            '@repeat-productSummary',
            '@repeat-recentOrders',
        ])

        const aliases = [
            '@repeat-dashboardSales',
            '@repeat-historicalSales',
            '@repeat-averageTicket',
            '@repeat-googleReviewsStats',
            '@repeat-storeVisitsStats',
            '@repeat-dashboardTrend',
            '@repeat-productStats',
            '@repeat-bestSellingProducts',
            '@repeat-mostRequestedProducts',
            '@repeat-productSummary',
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
    cy.intercept('GET', '**/api/v1/businesses/*/products/stats*').as(alias('productStats'))
    cy.intercept('GET', '**/api/v1/businesses/*/products/analytics/best-selling*').as(alias('bestSellingProducts'))
    cy.intercept('GET', '**/api/v1/businesses/*/products/analytics/most-requested*').as(alias('mostRequestedProducts'))
    cy.intercept('GET', '**/api/v1/businesses/*/products/analytics/summary*').as(alias('productSummary'))
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
