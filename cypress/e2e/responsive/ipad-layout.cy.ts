const viewports = [
    { name: 'iPad vertical', width: 768, height: 1024 },
    { name: 'iPad horizontal', width: 1024, height: 768 },
    { name: 'teléfono', width: 390, height: 844 },
    { name: 'escritorio', width: 1440, height: 900 },
] as const

function assertNoHorizontalOverflow() {
    cy.document().then((document) => {
        const viewportWidth = document.defaultView?.innerWidth ?? 0
        expect(document.documentElement.scrollWidth).to.be.at.most(viewportWidth)
    })
}

describe('Responsive · tablet y registro', () => {
    it('mantiene visibles los controles del registro en todos los tamaños soportados', () => {
        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height)
            cy.visit('/auth/register')

            cy.get('[data-testid="register-name"]').should('be.visible')
            cy.get('[data-testid="register-email"]').should('be.visible')
            cy.get('[data-testid="register-password"]').should('be.visible')
            cy.get('[data-testid="register-confirm-password"]').should('be.visible')
            cy.get('[data-testid="register-legal"]').should('be.visible')
            cy.get('[data-testid="register-submit"]').should('be.visible')
            assertNoHorizontalOverflow()
        }
    })

    it('mantiene accesible el login en todos los tamaños soportados', () => {
        for (const viewport of viewports) {
            cy.viewport(viewport.width, viewport.height)
            cy.visit('/auth/login')

            cy.get('[data-testid="login-email"]').should('be.visible')
            cy.get('[data-testid="login-password"]').should('be.visible')
            cy.get('[data-testid="login-submit"]').should('be.visible')
            assertNoHorizontalOverflow()
        }
    })

    it('evita overflow horizontal en los módulos protegidos del iPad', function () {
        cy.env(['testUserEmail', 'testUserPassword']).then(
            ({ testUserEmail, testUserPassword }) => {
                if (!testUserEmail || !testUserPassword) {
                    this.skip()
                    return
                }

                cy.login({ email: testUserEmail, password: testUserPassword })

                for (const viewport of viewports.slice(0, 2)) {
                    cy.viewport(viewport.width, viewport.height)

                    for (const route of [
                        '/dashboard',
                        '/dashboard/orders',
                        '/dashboard/products',
                        '/dashboard/account',
                        '/create-menu',
                    ]) {
                        cy.visit(route)
                        cy.get('body').should('be.visible')
                        assertNoHorizontalOverflow()
                    }
                }
            },
        )
    })
})
