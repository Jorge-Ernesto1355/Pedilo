type BusinessApi = {
    id: string
    name: string
    slug: string
    description: string
    ubication: string
    ubicationMaps: { latitude: number; longitude: number } | null
    businessSchedule: {
        days: Array<{ key: string; label: string; enabled: boolean }>
        openTime: string
        closeTime: string
    }
}

const uniqueSuffix = () => `${Date.now()}${Cypress._.random(100, 999)}`

function inspect(label: string) {
    cy.log(label)
    cy.env(['uiDelay', 'pauseForInspection']).then(({ uiDelay, pauseForInspection }) => {
        const delay = Number(uiDelay ?? 0)
        if (delay > 0) cy.wait(delay)
        if (pauseForInspection === true) cy.pause()
    })
}

function registerFreshOwner(email: string, password: string) {
    cy.visit('/auth/register')
    inspect('Página de registro cargada')
    cy.get('[data-testid="register-name"]').type('Cypress Business Owner')
    cy.get('[data-testid="register-email"]').type(email)
    cy.get('[data-testid="register-password"]').type(password)
    cy.get('[data-testid="register-confirm-password"]').type(password)
    cy.get('[data-testid="register-terms"]').check()
    cy.get('[data-testid="register-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/auth/login')
    inspect('Registro completado; página de login cargada')
    cy.get('[data-testid="login-email"]').type(email)
    cy.get('[data-testid="login-password"]').type(password)
    cy.get('[data-testid="login-submit"]').click()
    cy.location('pathname', { timeout: 15_000 }).should('eq', '/create-menu')
    inspect('Sesión iniciada; create-menu cargado')
}

function stubEmptyBusiness() {
    cy.intercept('GET', '**/api/v1/businesses/mine', {
        statusCode: 200,
        body: { business: null },
    }).as('getBusiness')
}

function visitCreateMenu() {
    stubEmptyBusiness()
    cy.visit('/create-menu')
    cy.contains('h1', 'Cuéntanos sobre tu negocio.').should('be.visible')
    inspect('Formulario de negocio visible')
}

function fillBusinessProfile(overrides: Partial<Record<string, string>> = {}) {
    cy.get('#businessName')
        .clear()
        .type(overrides.name ?? 'Tacos La Plaza')
    cy.get('#slug')
        .clear()
        .type(overrides.slug ?? `tacos-${uniqueSuffix()}`)
    cy.get('#location')
        .clear()
        .type(overrides.location ?? 'Culiacán, Sinaloa')
    cy.get('#description')
        .clear()
        .type(overrides.description ?? 'Tacos, quesadillas y aguas frescas.')
    cy.get('#open-time')
        .clear()
        .type(overrides.openTime ?? '10:30')
    cy.get('#close-time')
        .clear()
        .type(overrides.closeTime ?? '22:30')
}

function businessResponse(overrides: Partial<BusinessApi> = {}): BusinessApi {
    return {
        id: 'business-cypress-1',
        name: 'Tacos La Plaza',
        slug: 'tacos-la-plaza',
        description: 'Tacos, quesadillas y aguas frescas.',
        ubication: 'Culiacán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: {
            days: [
                { key: 'monday', label: 'Lun', enabled: true },
                { key: 'tuesday', label: 'Mar', enabled: true },
                { key: 'wednesday', label: 'Mié', enabled: true },
                { key: 'thursday', label: 'Jue', enabled: true },
                { key: 'friday', label: 'Vie', enabled: true },
                { key: 'saturday', label: 'Sáb', enabled: true },
                { key: 'sunday', label: 'Dom', enabled: false },
            ],
            openTime: '10:30',
            closeTime: '22:30',
        },
        ...overrides,
    }
}

describe('Crear menú · perfil del restaurante', () => {
    let registerEmail = ''
    let registerPassword = 'Strong-pass-123'
    let ownerEmail = ''

    before(function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }

            registerPassword = testRegisterPassword
            registerEmail = testRegisterEmail ?? 'cypress-business@example.test'
            const suffix = uniqueSuffix()
            ownerEmail = registerEmail.includes('@')
                ? registerEmail.replace('@', `+${suffix}@`)
                : `cypress-business-${suffix}@example.test`
        })
    })

    beforeEach(() => {
        cy.session(ownerEmail, () => registerFreshOwner(ownerEmail, registerPassword), {})
        visitCreateMenu()
    })

    it('muestra todos los campos del perfil, horario y recursos opcionales', () => {
        cy.get('#businessName').should('be.visible')
        cy.get('#slug').should('be.visible')
        cy.get('#location').should('be.visible')
        cy.get('#description').should('be.visible')
        cy.get('#open-time').should('be.visible')
        cy.get('#close-time').should('be.visible')
        cy.get('#business-logo').should('exist')
        cy.get('#business-cover').should('exist')
        cy.contains('button', 'Marcar ubicación exacta').should('be.visible')
        cy.contains('button', 'Guardar cambios').should('be.visible')
    })

    it('valida campos obligatorios y horarios sin enviar la creación', () => {
        let createCalls = 0
        cy.intercept('POST', '**/api/v1/businesses', () => {
            createCalls += 1
        }).as('createBusiness')

        cy.get('#businessName').clear()
        cy.get('#slug').clear()
        cy.get('#open-time').clear().type('19:00')
        cy.get('#close-time').clear().type('09:00')
        cy.get('[role="checkbox"]').then(($days) => {
            const enabledIndexes = $days
                .toArray()
                .flatMap((day, index) =>
                    day.getAttribute('aria-checked') === 'true' ? [index] : [],
                )
            const lastEnabledIndex = enabledIndexes.at(-1)

            expect(enabledIndexes.length).to.be.greaterThan(0)
            enabledIndexes.slice(0, -1).forEach((index) => {
                cy.get('[role="checkbox"]').eq(index).click()
            })
            if (lastEnabledIndex !== undefined) {
                cy.get('[role="checkbox"]').eq(lastEnabledIndex).click()
            }
        })
        cy.contains('Selecciona al menos un día.').should('be.visible')
        cy.contains('button', 'Guardar cambios').click()

        cy.contains('Escribe el nombre de tu negocio.').should('be.visible')
        cy.contains('Escribe una URL para tu negocio.').should('be.visible')
        cy.contains('Selecciona al menos un día.').should('be.visible')
        cy.contains('La hora de cierre debe ser posterior.').should('be.visible')
        cy.then(() => expect(createCalls).to.eq(0))
    })

    it('envía nombre, slug, ubicación, horario, coordenadas, logo y portada', () => {
        const response = businessResponse({
            name: 'Tacos La Plaza Centro',
            slug: 'tacos-la-plaza-centro',
            ubication: 'Centro, Culiacán',
            ubicationMaps: { latitude: 24.8091, longitude: -107.394 },
        })
        let requestBody = ''

        cy.intercept('POST', '**/api/v1/businesses', (request) => {
            requestBody =
                typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
            request.reply({ statusCode: 201, body: { business: response } })
        }).as('createBusiness')
        cy.intercept('GET', '**/api/v1/businesses/mine', {
            statusCode: 200,
            body: { business: response },
        }).as('getCreatedBusiness')
        cy.intercept('GET', 'https://nominatim.openstreetmap.org/search**', { body: [] })

        fillBusinessProfile({
            name: response.name,
            slug: response.slug,
            location: response.ubication,
            description: response.description,
        })
        cy.get('#business-logo').selectFile(
            {
                contents: Cypress.Buffer.from('fake-logo'),
                fileName: 'logo.png',
                mimeType: 'image/png',
            },
            { force: true },
        )
        cy.get('#business-cover').selectFile(
            {
                contents: Cypress.Buffer.from('fake-cover'),
                fileName: 'cover.jpg',
                mimeType: 'image/jpeg',
            },
            { force: true },
        )
        cy.contains('button', 'Marcar ubicación exacta').click()
        cy.get('#latitude').clear().type('24.8091')
        cy.get('#longitude').clear().type('-107.394')
        cy.contains('button', 'Guardar ubicación').click()
        cy.contains('button', 'Guardar cambios').click()

        cy.wait('@createBusiness').its('request.method').should('eq', 'POST')
        cy.wait('@getCreatedBusiness')
        cy.then(() => {
            expect(requestBody).to.include('Tacos La Plaza Centro')
            expect(requestBody).to.include('tacos-la-plaza-centro')
            expect(requestBody).to.include('Centro, Culiacán')
            expect(requestBody).to.include('businessSchedule')
            expect(requestBody).to.include('logo')
            expect(requestBody).to.include('cover')
            expect(requestBody).to.include('ubicationMaps')
        })
        cy.contains('Cambios guardados').should('be.visible')
    })

    it('rechaza los límites de nombre, slug, ubicación y descripción antes de enviar', () => {
        let createCalls = 0
        cy.intercept('POST', '**/api/v1/businesses', () => {
            createCalls += 1
        }).as('createBusiness')

        cy.get('#businessName').clear().type('N'.repeat(41))
        cy.get('#slug').clear().type('s'.repeat(31))
        cy.get('#location').clear().type('L'.repeat(31))
        cy.get('#description').clear().type('D'.repeat(181))
        cy.contains('button', 'Guardar cambios').click()

        cy.contains('Usa 40 caracteres o menos.').should('be.visible')
        cy.contains('Usa 30 caracteres o menos').should('be.visible')
        cy.contains('Usa 100 caracteres o menos.').should('be.visible')
        cy.contains('Usa 180 caracteres o menos.').should('be.visible')
        cy.then(() => expect(createCalls).to.eq(0))
    })

    it('no guarda coordenadas inválidas desde el selector de ubicación', () => {
        let createCalls = 0
        cy.intercept('POST', '**/api/v1/businesses', () => {
            createCalls += 1
        }).as('createBusiness')

        cy.contains('button', 'Marcar ubicación exacta').click()
        cy.get('#latitude').clear().type('91')
        cy.get('#longitude').clear().type('-181')
        cy.contains('button', 'Guardar ubicación').click()
        cy.contains('Latitud inválida.').should('be.visible')
        cy.contains('Longitud inválida.').should('be.visible')
        cy.get('[role="dialog"]').should('be.visible')

        cy.get('#latitude').clear().type('24.8091')
        cy.get('#longitude').clear().type('-107.394')
        cy.contains('button', 'Guardar ubicación').click()
        cy.get('[role="dialog"]').should('not.exist')
        cy.then(() => expect(createCalls).to.eq(0))
    })

    it('evita crear dos negocios al hacer doble click mientras el POST sigue pendiente', () => {
        let createCalls = 0
        cy.intercept('POST', '**/api/v1/businesses', (request) => {
            createCalls += 1
            request.reply({ delay: 800, statusCode: 201, body: { business: businessResponse() } })
        }).as('createBusiness')

        fillBusinessProfile()
        cy.get('form button[type="submit"]').click()
        cy.get('form button[type="submit"]')
            .should('be.disabled')
            .and('have.attr', 'aria-busy', 'true')
            .and('contain', 'Creando negocio…')
            .click({ force: true })
        cy.then(() => expect(createCalls).to.eq(1))
        cy.wait('@createBusiness')
    })

    it('muestra el error del backend cuando el slug ya existe y permite corregirlo', () => {
        cy.intercept('POST', '**/api/v1/businesses', {
            statusCode: 409,
            body: {
                error: {
                    code: 'SLUG_ALREADY_EXISTS',
                    message: 'La URL del negocio ya está en uso.',
                    fieldErrors: { slug: ['La URL del negocio ya está en uso.'] },
                },
            },
        }).as('createBusiness')

        fillBusinessProfile({ slug: 'slug-existente' })
        cy.contains('button', 'Guardar cambios').click()
        cy.wait('@createBusiness')
        cy.get('#slug').should('have.value', 'slug-existente')
        cy.get('#slug')
            .parent()
            .find('[role="alert"]')
            .should('be.visible')
            .and('contain', 'La URL del negocio ya está en uso.')
        cy.get('form button[type="submit"]')
            .parent()
            .find('[role="alert"]')
            .should('be.visible')
            .and('contain', 'La URL del negocio ya está en uso.')

        cy.get('#slug').clear().type(`slug-libre-${uniqueSuffix()}`)
        cy.get('#slug').should('have.value.match', /^slug-libre-/)
    })

    it('muestra error 500 y permite reintentar sin bloquear el formulario', () => {
        let createCalls = 0
        cy.intercept('POST', '**/api/v1/businesses', (request) => {
            createCalls += 1
            if (createCalls === 1) {
                request.reply({
                    statusCode: 500,
                    body: {
                        error: { code: 'INTERNAL_ERROR', message: 'Error temporal del servidor.' },
                    },
                })
                return
            }
            request.reply({ statusCode: 201, body: { business: businessResponse() } })
        }).as('createBusiness')

        fillBusinessProfile()
        cy.contains('button', 'Guardar cambios').click()
        cy.wait('@createBusiness')
        cy.contains('Error temporal del servidor.').should('be.visible')

        cy.contains('button', 'Guardar cambios').should('not.be.disabled').click()
        cy.wait('@createBusiness')
        cy.then(() => expect(createCalls).to.eq(2))
    })

    it('guarda moneda y zona horaria desde la configuración del negocio', () => {
        const response = businessResponse()
        cy.intercept('POST', '**/api/v1/businesses', {
            statusCode: 201,
            body: { business: response },
        }).as('createBusiness')
        cy.intercept('GET', '**/api/v1/businesses/mine', {
            statusCode: 200,
            body: { business: response },
        })
        cy.intercept('GET', '**/api/v1/businesses/settings', {
            statusCode: 200,
            body: {
                id: 'settings-1',
                businessId: response.id,
                currency: 'MXN',
                phone: null,
                whatsapp: null,
                address: null,
                timezone: 'America/Mazatlan',
            },
        }).as('getSettings')
        cy.intercept('PATCH', '**/api/v1/businesses/settings', (request) => {
            expect(request.body).to.deep.include({ currency: 'USD', timezone: 'UTC' })
            request.reply({
                statusCode: 200,
                body: {
                    id: 'settings-1',
                    businessId: response.id,
                    currency: 'USD',
                    phone: null,
                    whatsapp: null,
                    address: null,
                    timezone: 'UTC',
                },
            })
        }).as('updateSettings')

        fillBusinessProfile()
        cy.contains('button', 'Guardar cambios').click()
        cy.wait('@createBusiness')
        cy.contains('button', 'Configurar negocio').click()
        cy.wait('@getSettings')
        cy.get('#settings-currency').select('USD')
        cy.get('#settings-timezone').select('UTC')
        cy.get('[role="dialog"]').contains('button', 'Guardar cambios').click()
        cy.wait('@updateSettings')
        cy.get('[role="dialog"]').should('not.exist')
    })

    it('persiste los datos reales después de recargar la página', () => {
        const suffix = uniqueSuffix()
        const expectedName = `Cypress Persist ${suffix}`
        const expectedSlug = `cypress-persist-${suffix}`.slice(0, 30)
        cy.intercept('POST', '**/api/v1/businesses').as('createBusiness')
        cy.intercept('GET', '**/api/v1/businesses/mine').as('getBusinessMine')

        fillBusinessProfile({
            name: expectedName,
            slug: expectedSlug,
            location: 'Mazatlán, Sinaloa',
            description: 'Perfil creado por Cypress para verificar persistencia.',
            openTime: '08:00',
            closeTime: '21:00',
        })
        cy.contains('button', 'Guardar cambios').click()
        cy.wait('@createBusiness').its('response.statusCode').should('be.oneOf', [200, 201])
        cy.wait('@getBusinessMine')
        cy.contains('Cambios guardados').should('be.visible')

        cy.reload()
        cy.wait('@getBusinessMine')
        cy.contains('h1', 'Cuéntanos sobre tu negocio.').should('be.visible')
        cy.get('#businessName').should('not.have.value', 'La Esquina')
        cy.get('#businessName').should('have.value', expectedName)
        cy.get('#slug').should('have.value', expectedSlug)
        cy.get('#location').should('have.value', 'Mazatlán, Sinaloa')
        cy.get('#description').should(
            'have.value',
            'Perfil creado por Cypress para verificar persistencia.',
        )
        cy.get('#open-time').should('have.value', '08:00')
        cy.get('#close-time').should('have.value', '21:00')
    })
})
