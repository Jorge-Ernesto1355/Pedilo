describe('Public · página 404', () => {
    it('muestra la página personalizada únicamente para una ruta inexistente', () => {
        cy.request({
            url: '/ruta-inexistente/pedilo-404',
            failOnStatusCode: false,
        })
            .its('status')
            .should('eq', 404)

        cy.visit('/ruta-inexistente/pedilo-404', { failOnStatusCode: false })
        cy.get('[data-testid="not-found-page"]').should('be.visible')
        cy.contains('h1', '¡Ups! Este pedido se perdió en el camino.').should('be.visible')
        cy.get('[data-testid="not-found-visual"]').should('be.visible')
        cy.get('[data-testid="not-found-home"]').should('have.attr', 'href', '/')
        cy.get('[data-testid="not-found-back"]').should('be.visible')
    })

    it('no reemplaza rutas públicas válidas ni autenticación', () => {
        cy.visit('/')
        cy.get('[data-testid="not-found-page"]').should('not.exist')

        cy.visit('/auth/login')
        cy.get('[data-testid="not-found-page"]').should('not.exist')
        cy.get('[data-testid="login-submit"]').should('be.visible')
    })

    it('mantiene la composición sin overflow en móvil, tablet y escritorio', () => {
        for (const viewport of [
            [390, 844],
            [768, 1024],
            [1024, 768],
            [1440, 900],
        ]) {
            cy.viewport(viewport[0], viewport[1])
            cy.visit('/ruta-inexistente/pedilo-404', { failOnStatusCode: false })
            cy.get('[data-testid="not-found-page"]').should('be.visible')
            cy.document().then((document) => {
                expect(document.documentElement.scrollWidth).to.be.at.most(
                    document.defaultView?.innerWidth ?? 0,
                )
            })
        }
    })
})
