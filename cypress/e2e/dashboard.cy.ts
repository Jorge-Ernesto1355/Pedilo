const seedProducts = [
    85, 95, 110, 75, 35, 120, 145, 110, 75, 55, 95, 90, 130, 80, 35, 150, 290, 30, 60, 85,
]
// El dashboard contabiliza READY y PREPARING; las tres órdenes PENDING no son ventas todavía.
const expectedSalesOrders = 27
const expectedDashboardSales = Array.from(
    { length: expectedSalesOrders },
    (_, index) => index,
).reduce((total, index) => total + seedProducts[index % seedProducts.length] * ((index % 4) + 1), 0)

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
        cy.intercept('GET', '**/dashboard/sales*').as('getDashboardSales')
        cy.visit('/dashboard')
        cy.wait('@getDashboardSales').then(({ response }) => {
            expect(response?.statusCode).to.eq(200)
            expect(response?.body.ordersCount).to.eq(expectedSalesOrders)
            expect(response?.body.total).to.eq(expectedDashboardSales)
            expect(response?.body.averageTicket).to.eq(
                Math.round(expectedDashboardSales / expectedSalesOrders),
            )
        })
        cy.get('[aria-label="Resumen del negocio"]').should('be.visible')
        cy.contains('h2', 'Cómo te fue').should('be.visible')
        cy.contains('h2', 'Lo más vendido').should('be.visible')
        cy.contains('h2', 'Cómo va tu negocio').should('be.visible')
        cy.contains('h2', 'Pedidos recientes').should('be.visible')
    })

    it('permite revisar ventas y tendencia sin generar datos nuevos', () => {
        cy.intercept('POST', '**/businesses/*/orders').as('unexpectedOrderCreation')
        cy.intercept('GET', '**/dashboard/sales*').as('getDashboardSales')
        cy.visit('/dashboard/sales')
        cy.wait('@getDashboardSales').its('response.statusCode').should('eq', 200)
        cy.get('[aria-label="Métricas de ventas"]').should('be.visible')
        cy.get('[aria-label^="Gráfica de ventas"]').should('be.visible')
        cy.get('table caption').should('contain', 'Ventas y órdenes por periodo')
        cy.get('[aria-label="Periodo de ventas"] button').each(($button) => {
            cy.wrap($button).click()
            cy.get('[aria-busy="true"], [aria-busy="false"]').should('exist')
        })
        cy.get('@unexpectedOrderCreation.all').should('have.length', 0)
    })

    it('muestra las 30 órdenes E2E y conserva sus estados', () => {
        cy.intercept('GET', '**/businesses/*/orders*').as('getDashboardOrders')
        cy.visit('/dashboard/orders')
        cy.wait('@getDashboardOrders').then(({ response }) => {
            expect(response?.statusCode).to.eq(200)
            expect(response?.body.total).to.be.at.least(30)
            expect(response?.body.orders).to.have.length.greaterThan(0)
        })
        cy.contains('Pedidos').should('be.visible')
        cy.get('article').should('have.length.at.least', 1)
    })
})

export {}
