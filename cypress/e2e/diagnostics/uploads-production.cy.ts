const logoFixture = 'public/logoPediloSinfondo.png'

function requireDiagnosticCredentials() {
    const env = Cypress.config('env') as {
        diagnosticEmail?: string
        diagnosticPassword?: string
    }
    const email = env.diagnosticEmail
    const password = env.diagnosticPassword
    if (!email || !password)
        throw new Error(
            'Configura CYPRESS_TEST_EMAIL y CYPRESS_TEST_PASSWORD para ejecutar el diagnóstico de uploads.',
        )
    return { email, password }
}

function waitForHttp(alias: `@${string}`, expected: number[]) {
    return cy.wait(alias).then((interception) => {
        expect(Boolean(interception.response), `La request ${alias} no recibió respuesta`).to.equal(true)
        expect(interception.response?.statusCode, `Status de ${alias}`).to.be.oneOf(expected)
        expect(interception.request.url, `URL de ${alias}`).to.match(/\/api\/v1\//)
        cy.log(`${alias}: ${interception.response?.statusCode} ${interception.request.url}`)
        return interception
    })
}

describe('Diagnóstico real · uploads de imágenes', () => {
    beforeEach(function () {
        try {
            const { email, password } = requireDiagnosticCredentials()
            cy.login({ email, password })
        } catch (error) {
            cy.log(error instanceof Error ? error.message : String(error))
            this.skip()
        }
    })

    it('actualiza el logo y confirma persistencia después de recargar', () => {
        cy.intercept('GET', '**/api/v1/businesses/mine').as('getBusiness')
        cy.intercept('PATCH', '**/api/v1/businesses/*').as('updateBusinessLogo')
        cy.visit('/create-menu')
        cy.get('#business-logo').selectFile(logoFixture, { force: true })
        cy.contains('button', 'Guardar cambios').click()
        waitForHttp('@updateBusinessLogo', [200, 204]).then(({ request }) => {
            expect(String(request.body)).to.include('logo')
        })
        cy.contains('Cambios guardados', { timeout: 20_000 }).should('be.visible')
        cy.reload()
        cy.get('img[alt="Vista previa del logo"]', { timeout: 20_000 })
            .should('be.visible')
            .and('have.attr', 'src')
    })

    it('actualiza la portada y confirma persistencia después de recargar', () => {
        cy.intercept('PATCH', '**/api/v1/businesses/*').as('updateBusinessCover')
        cy.visit('/create-menu')
        cy.get('#business-cover').selectFile(logoFixture, { force: true })
        cy.contains('button', 'Guardar cambios').click()
        waitForHttp('@updateBusinessCover', [200, 204]).then(({ request }) => {
            expect(String(request.body)).to.include('cover')
        })
        cy.contains('Cambios guardados', { timeout: 20_000 }).should('be.visible')
        cy.reload()
        cy.get('img[alt="Vista previa de la portada"]', { timeout: 20_000 })
            .should('be.visible')
            .and('have.attr', 'src')
    })

    it('crea un producto con imagen y observa la respuesta real del backend', () => {
        const productName = `Cypress upload ${Date.now()}`
        cy.intercept('POST', '**/api/v1/businesses/*/products').as('createProduct')
        cy.visit('/dashboard/products')
        cy.contains('button', 'Nuevo producto', { timeout: 20_000 }).click()
        cy.get('[role="dialog"] input').first().clear().type(productName)
        cy.get('[role="dialog"] textarea').clear().type('Producto de diagnóstico E2E.')
        cy.get('[role="dialog"] input[inputmode="decimal"]').clear().type('100')
        cy.get('[role="dialog"] select')
            .first()
            .find('option')
            .not('[value=""]')
            .first()
            .then(($option) => {
                cy.get('[role="dialog"] select')
                    .first()
                    .select($option.val() as string)
            })
        cy.get('input[type="file"]').selectFile(logoFixture, { force: true })
        cy.contains('[role="dialog"] button', 'Crear producto').click()
        waitForHttp('@createProduct', [200, 201]).then(({ request, response }) => {
            expect(String(request.body)).to.include('image')
            expect(response?.body).to.not.equal(undefined)
        })
        cy.contains('Producto creado', { timeout: 20_000 }).should('be.visible')
        cy.contains('[role="dialog"] button', 'Cancelar').click()
        cy.reload()
        cy.contains('td', productName, { timeout: 20_000 }).should('be.visible')
        cy.contains('td', productName).closest('tr').find('img').should('have.attr', 'src')
    })

    it('edita la imagen de un producto y confirma persistencia después de recargar', () => {
        cy.visit('/dashboard/products')
        cy.get('table tbody tr', { timeout: 20_000 })
            .first()
            .find('button[aria-label^="Editar "]')
            .click()
        cy.intercept('PATCH', '**/api/v1/businesses/products/*').as('updateProduct')
        cy.get('input[type="file"]').selectFile(logoFixture, { force: true })
        cy.contains('[role="dialog"] button', 'Guardar cambios').click()
        waitForHttp('@updateProduct', [200, 204]).then(({ request, response }) => {
            expect(String(request.body)).to.include('image')
            expect(response?.body).to.not.equal(undefined)
        })
        cy.contains('Producto actualizado', { timeout: 20_000 }).should('be.visible')
        cy.contains('[role="dialog"] button', 'Cancelar').click()
        cy.reload()
        cy.get('table tbody tr', { timeout: 20_000 }).first().find('img').should('have.attr', 'src')
    })
})
