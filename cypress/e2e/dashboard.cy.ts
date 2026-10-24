type SeedManifest = {
    expected: {
        today: { total: number; orders: number }
    }
    orders: unknown[]
}

describe('Dashboard · escenario E2E persistente', () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error('Ejecuta npm run e2e:seed antes de probar el dashboard.')
            }
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
    })

    it('muestra el resumen con las ventas del escenario sembrado', () => {
        cy.intercept('GET', '**/api/v1/dashboard/sales*').as('getDashboardSales')
        cy.visit('/dashboard')
        cy.readFile<SeedManifest>('test-results/dashboard-seed-manifest.json').then((manifest) => {
            cy.wait('@getDashboardSales').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.ordersCount).to.eq(manifest.expected.today.orders)
                expect(response?.body.total).to.eq(manifest.expected.today.total)
            })
        })
        cy.get('[aria-label="Resumen del negocio"]').should('be.visible')
        cy.contains('h2', 'Cómo te fue').should('be.visible')
        cy.contains('h2', 'Lo más vendido').should('be.visible')
        cy.contains('h2', 'Cómo va tu negocio').should('be.visible')
        cy.contains('h2', 'Pedidos recientes').should('be.visible')
    })

    it('permite revisar ventas y tendencia sin generar datos nuevos', () => {
        cy.intercept('POST', '**/businesses/*/orders').as('unexpectedOrderCreation')
        const periods = [
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: 'thisMonth', label: 'Este mes' },
            { value: 'today', label: 'Hoy' },
        ]
        periods.forEach(({ value }) => {
            cy.intercept({
                method: 'GET',
                url: '**/api/v1/dashboard/sales*',
                query: { period: value },
            }).as(`getDashboardSales-${value}`)
        })
        cy.visit('/dashboard/sales')
        cy.wait('@getDashboardSales-today').its('response.statusCode').should('eq', 200)
        cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
        cy.get('[aria-label^="Gráfica de ventas"]').should('be.visible')
        cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
        periods.forEach(({ value, label }) => {
            cy.get(`[aria-label="Periodo de ventas"] button[data-value="${value}"]`)
                .should('contain', label)
                .click()
            cy.wait(`@getDashboardSales-${value}`).then(({ request }) => {
                expect(new URL(request.url).searchParams.get('period')).to.eq(value)
            })
            cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
        })
        cy.get('@unexpectedOrderCreation.all').should('have.length', 0)
    })

    it('muestra las órdenes sembradas y conserva sus estados', () => {
        cy.intercept('GET', '**/businesses/*/orders*').as('getDashboardOrders')
        cy.visit('/dashboard/orders')
        cy.readFile<SeedManifest>('test-results/dashboard-seed-manifest.json').then((manifest) => {
            cy.wait('@getDashboardOrders').then(({ response }) => {
                expect(response?.statusCode).to.eq(200)
                expect(response?.body.total).to.eq(manifest.orders.length)
                expect(response?.body.orders).to.have.length.greaterThan(0)
            })
        })
        cy.contains('Pedidos').should('be.visible')
        cy.get('article').should('have.length.at.least', 1)
    })
})

export {}
