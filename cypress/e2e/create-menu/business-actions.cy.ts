const business = {
    id: 'business-actions-e2e',
    name: 'Restaurante de prueba',
    slug: 'restaurante-de-prueba',
    description: 'Un negocio para validar las acciones de configuración.',
    ubication: 'Mazatlán, Sinaloa',
    ubicationMaps: null,
    businessSchedule: {
        days: [{ key: 'monday', label: 'Lun', enabled: true }],
        openTime: '09:00',
        closeTime: '18:00',
    },
}

function installBusinessMocks() {
    const settings = {
        id: 'settings-business-actions-e2e',
        businessId: business.id,
        currency: 'MXN',
        phone: null,
        whatsapp: null as string | null,
        address: null,
        timezone: 'America/Mazatlan',
    }
    cy.intercept('GET', '**/api/v1/businesses/mine', {
        statusCode: 200,
        body: { business },
    })
    cy.intercept('GET', '**/api/v1/businesses/mine/menus', {
        statusCode: 200,
        body: { menus: [] },
    })
    cy.intercept('GET', '**/api/v1/businesses/settings', (request) => {
        request.reply({ statusCode: 200, body: settings })
    }).as('businessSettings')
    cy.intercept('PATCH', '**/api/v1/businesses/settings', (request) => {
        // Mutate the shared fixture so subsequent GETs after page reload return
        // the saved value as a real persistent settings endpoint would.
        Object.assign(settings, request.body)
        request.reply({ statusCode: 200, body: settings })
    }).as('saveBusinessSettings')
    cy.intercept('GET', '**/api/v1/businesses/google-reviews', {
        statusCode: 200,
        body: {
            link: {
                id: 'google-review-link-e2e',
                businessId: business.id,
                qrCode: 'QrCodeForBusinessActionsE2E',
                url: 'https://g.page/r/example/review',
                createdAt: '2026-10-30T12:00:00.000Z',
                updatedAt: '2026-10-30T12:00:00.000Z',
            },
            business: { name: business.name, logoUrl: null, coverUrl: null },
        },
    }).as('googleReviews')
}

describe('Crear menú · acciones de negocio', () => {
    beforeEach(() => {
        cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
            if (!e2eSeedEmail || !e2eSeedPassword) {
                throw new Error('Ejecuta npm run e2e:seed antes de esta suite.')
            }
            cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        })
        installBusinessMocks()
        cy.visit('/create-menu')
        cy.wait('@businessSettings')
    })

    it('muestra las tres acciones y conserva la configuración general sin WhatsApp', () => {
        cy.get('[aria-labelledby="business-actions-title"]').within(() => {
            cy.contains('h3', 'Configuración de negocio').should('be.visible')
            cy.contains('h3', 'Google Reviews').should('be.visible')
            cy.contains('h3', 'WhatsApp').should('be.visible')
        })
        cy.contains('button', 'Configurar').click()
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('#settings-currency').should('be.visible')
        cy.get('#settings-phone').should('be.visible')
        cy.get('#settings-timezone').should('be.visible')
        cy.get('#settings-whatsapp').should('not.exist')
        cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
        cy.get('[role="dialog"]').should('not.exist')
    })

    it('abre el flujo existente de Google Reviews y genera el QR guardado', () => {
        cy.contains('button', 'Ver código QR').click()
        cy.wait('@googleReviews')
        cy.contains('h3', 'Tres formas de invitar a opinar', { timeout: 15_000 }).should(
            'be.visible',
        )
        cy.get('img[alt="Vista previa del QR personalizado de Google Reviews"]', {
            timeout: 15_000,
        }).should('be.visible')
    })

    it('guía al WhatsApp, enfoca el campo y conserva el mensaje descartado solo en la sesión', () => {
        const welcomeMessage =
            '¡Hola! 👋 Antes de recibir pedidos, necesitas registrar tu número de WhatsApp para que podamos enviártelos.'

        cy.get('aside[aria-label="Asistente de configuración"] [role="status"]', {
            timeout: 5_000,
        })
            .should('be.visible')
            .and('contain', welcomeMessage)
        cy.contains('button', 'Registrar mi número').click()
        cy.get('#business-whatsapp').should('have.focus')
        cy.get('#whatsapp-card').should('have.class', 'ring-4').and('have.class', 'ring-indigo-200')
        cy.get('aside[aria-label="Asistente de configuración"] [role="status"]').should('not.exist')

        cy.get('button[aria-label="Abrir ayuda del asistente"]').click()
        cy.contains('button', 'Registrar mi número').should('be.visible')
        cy.get('button[aria-label="Cerrar mensaje"]').click()
        cy.window().then((window) => {
            expect(
                window.sessionStorage.getItem(
                    `pedilo:onboarding-whatsapp-dismissed:${business.id}`,
                ),
            ).to.equal('true')
        })
        cy.get('button[aria-label="Abrir ayuda del asistente"]').click()
        cy.contains('button', 'Registrar mi número').should('be.visible')
    })

    it('valida antes del PATCH y persiste los 10 dígitos que espera el backend', () => {
        cy.get('#whatsapp-card').should('be.visible')
        cy.get('#business-whatsapp', { timeout: 15_000 }).should('be.visible')
        // Freeze the onboarding/success timers only after settings have rendered.
        cy.clock().as('businessActionsClock')
        cy.contains('button', 'Guardar número').click()
        cy.get('[role="alert"]').should('contain', 'Ingresa tu número de WhatsApp.')

        cy.get('#business-whatsapp').type('123')
        cy.contains('button', 'Guardar número').click()
        cy.get('[role="alert"]').should(
            'contain',
            'El número está incompleto. Debe tener 10 dígitos.',
        )

        cy.get('#business-whatsapp').clear().type('0000000000')
        cy.contains('button', 'Guardar número').click()
        cy.get('[role="alert"]').should('contain', 'Este número no parece válido.')

        cy.get('#business-whatsapp').clear().type('55123456789')
        cy.contains('button', 'Guardar número').click()
        cy.get('[role="alert"]').should('contain', 'El número tiene más de 10 dígitos. Revísalo.')
        cy.get('@saveBusinessSettings.all').should('have.length', 0)

        cy.get('#business-whatsapp').clear().type('6981119319')
        cy.get('#business-whatsapp').should('have.value', '+52 698 111 9319')
        cy.contains('button', 'Guardar número').click()
        cy.wait('@saveBusinessSettings').then(({ request, response }) => {
            expect(request.url).to.include('/api/v1/businesses/settings')
            expect(request.method).to.equal('PATCH')
            expect(request.body).to.deep.equal({ whatsapp: '6981119319' })
            expect(response?.statusCode).to.equal(200)
            expect(response?.body.whatsapp).to.equal('6981119319')
        })
        cy.contains('Número guardado correctamente.').should('be.visible')
        cy.get('aside[aria-label="Asistente de configuración"] [role="status"]')
            .should('be.visible')
            .and('contain', '¡Listo! Ya puedes recibir pedidos por WhatsApp. 🎉')
        cy.get('#business-whatsapp').should('have.value', '+52 698 111 9319')

        cy.tick(3999)
        cy.get('aside[aria-label="Asistente de configuración"]').should('be.visible')
        cy.tick(1)
        cy.tick(260)
        cy.get('aside[aria-label="Asistente de configuración"]').should('not.exist')

        cy.get<Cypress.Clock>('@businessActionsClock').then((clock) => clock.restore())
        // Model the persisted backend state on the next read after the PATCH.
        cy.intercept('GET', '**/api/v1/businesses/settings', {
            statusCode: 200,
            body: {
                id: 'settings-business-actions-e2e',
                businessId: business.id,
                currency: 'MXN',
                phone: null,
                whatsapp: '6981119319',
                address: null,
                timezone: 'America/Mazatlan',
            },
        }).as('persistedBusinessSettings')
        cy.reload()
        cy.wait('@persistedBusinessSettings')
            .its('response.body.whatsapp')
            .should('eq', '6981119319')
        cy.get('#business-whatsapp').should('have.value', '+52 698 111 9319')
    })
})

export {}
