type QrRedirectResponse = { slug?: string; error?: { code?: string } }

let backendOrigin = ''
let qrTokenA: string | undefined
let qrSlugA: string | undefined
let qrTokenB: string | undefined
let qrSlugB: string | undefined

function backendUrl() {
    return backendOrigin
}

function resolveToken(token: string) {
    return cy.request<QrRedirectResponse>({
        url: `${backendUrl()}/api/v1/public/qr/${encodeURIComponent(token)}`,
        failOnStatusCode: false,
    })
}

function requestFrontendQr(token: string) {
    return cy.request({
        url: `${Cypress.config('baseUrl')}/api/qr/${encodeURIComponent(token)}`,
        followRedirect: false,
        failOnStatusCode: false,
    })
}

function updateBusinessProfile(name: string, slug: string) {
    cy.intercept('PATCH', '**/api/v1/businesses/*').as('updateBusinessProfile')
    cy.visit('/create-menu')
    cy.get('#businessName', { timeout: 15_000 }).clear().type(name)
    cy.get('#slug').clear().type(slug)
    cy.contains('button', 'Guardar cambios').click()
    cy.wait('@updateBusinessProfile').its('response.statusCode').should('be.oneOf', [200, 204])
}

describe('Menú público · QR dinámico y permanente', function () {
    before(function () {
        cy.env(['backendUrl', 'qrTestTokenA', 'qrTestSlugA', 'qrTestTokenB', 'qrTestSlugB']).then(
            ({ backendUrl, qrTestTokenA, qrTestSlugA, qrTestTokenB, qrTestSlugB }) => {
                backendOrigin = String(backendUrl).replace(/\/$/, '')
                qrTokenA = typeof qrTestTokenA === 'string' ? qrTestTokenA : undefined
                qrSlugA = typeof qrTestSlugA === 'string' ? qrTestSlugA : undefined
                qrTokenB = typeof qrTestTokenB === 'string' ? qrTestTokenB : undefined
                qrSlugB = typeof qrTestSlugB === 'string' ? qrTestSlugB : undefined
            },
        )
        cy.then(function () {
            if (!qrTokenA || !qrSlugA) this.skip()
        })
    })

    it('resuelve el QR de un restaurante creado a su slug actual', () => {
        resolveToken(qrTokenA!).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body.slug).to.eq(qrSlugA)
        })
    })

    it('muestra en la interfaz la URL permanente del QR', () => {
        cy.login()
        cy.visit('/create-menu')
        cy.get('[data-testid="business-qr-open"]', { timeout: 15_000 }).click()
        cy.get('[role="dialog"]').should('contain', `/${qrTokenA}`)
    })

    it('genera y descarga el SVG del QR', () => {
        cy.login()
        cy.visit('/create-menu')
        cy.get('[data-testid="business-qr-open"]', { timeout: 15_000 }).click()
        cy.get('[data-testid="business-qr-download-svg"]', { timeout: 15_000 })
            .should('be.enabled')
            .click()
        cy.readFile('cypress/downloads/menuly-menu-qr.svg', { timeout: 15_000 }).should(
            'contain',
            '<svg',
        )
    })

    it('redirige inicialmente mediante 307 a la página pública actual', () => {
        requestFrontendQr(qrTokenA!).then((response) => {
            expect(response.status).to.eq(307)
            expect(response.headers.location).to.eq(`/${qrSlugA}`)
            expect(response.headers['cache-control']).to.contain('no-store')
        })
    })

    it('conserva el token al cambiar el nombre del restaurante', () => {
        cy.login()
        updateBusinessProfile(`Restaurante QR ${Date.now()}`, qrSlugA!)
        resolveToken(qrTokenA!).then((after) => {
            expect(after.body.slug).to.eq(qrSlugA)
        })
    })

    it('mantiene funcionando el QR después de actualizar el nombre', () => {
        resolveToken(qrTokenA!).its('body.slug').should('eq', qrSlugA)
    })

    it('mantiene el mismo token mientras se actualiza el slug desde la configuración', () => {
        cy.login()
        updateBusinessProfile(`Restaurante QR ${Date.now()}`, qrSlugA!)
        resolveToken(qrTokenA!).its('body.slug').should('eq', qrSlugA)
    })

    it('redirige el token original al slug vigente después del cambio de slug', () => {
        const newSlug = `qr-cypress-${Date.now()}`
        cy.login()
        updateBusinessProfile(`Restaurante QR ${Date.now()}`, newSlug)
        requestFrontendQr(qrTokenA!).then((response) => {
            expect(response.status).to.eq(307)
            expect(response.headers.location).to.eq(`/${newSlug}`)
        })
        updateBusinessProfile(`Restaurante QR restaurado ${Date.now()}`, qrSlugA!)
    })

    it('conserva exactamente el mismo contenido QR al volver a generarlo', () => {
        cy.login()
        cy.visit('/create-menu')
        cy.get('[data-testid="business-qr-open"]', { timeout: 15_000 }).click()
        cy.get('[data-testid="business-qr-image"]', { timeout: 15_000 }).should('be.visible')
        cy.get('[role="dialog"]').should('contain', `/${qrTokenA}`)
    })

    it('permite resolver el QR sin una sesión autenticada', () => {
        cy.clearCookies()
        resolveToken(qrTokenA!).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body.slug).to.eq(qrSlugA)
        })
    })

    it('mantiene aislados los QR de dos restaurantes', function () {
        if (!qrTokenB || !qrSlugB) this.skip()
        resolveToken(qrTokenA!).its('body.slug').should('eq', qrSlugA)
        resolveToken(qrTokenB!).its('body.slug').should('eq', qrSlugB)
        expect(qrTokenA).not.to.eq(qrTokenB)
    })

    it('conserva el identificador al cambiar de sesión', () => {
        cy.clearCookies()
        resolveToken(qrTokenA!).its('body.slug').should('eq', qrSlugA)
    })

    it('responde 404 de forma segura para un identificador inexistente', () => {
        resolveToken('c00000000000000000000000').then((response) => {
            expect(response.status).to.eq(404)
            expect(response.body.error?.code).to.eq('PUBLIC_QR_NOT_FOUND')
        })
    })
})
