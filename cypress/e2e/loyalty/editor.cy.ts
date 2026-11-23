// Editor de la tarjeta de lealtad en Ajustes (/create-menu). Fase 5.
import {
    asOwner,
    customerWithStamps,
    cardDetail,
    loginOwnerUi,
    type LoyaltySeed,
    owner,
    saveProgram,
    seedLoyalty,
} from './loyaltySupport'

const PROGRAM_URL = '**/api/v1/businesses/loyalty/program'

let seed: LoyaltySeed

function openEditor() {
    cy.intercept('GET', PROGRAM_URL).as('getProgram')
    cy.visit('/create-menu')
    cy.get('#tarjeta-de-lealtad').scrollIntoView()
    cy.wait('@getProgram')
    cy.get('[data-cy="loyalty-skeleton"]').should('not.exist')
}

/** Mueve un control de rango como lo haría el usuario (React escucha el evento input). */
function setRange(selector: string, value: number) {
    cy.get(selector).then(($input) => {
        const input = $input[0] as HTMLInputElement
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        setter.call(input, String(value))
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}

const previewCard = '[data-cy="loyalty-preview"] [data-testid="loyalty-card"]'

function openSection(id: string) {
    cy.get(`[data-cy="loyalty-section-toggle-${id}"]`).then(($button) => {
        if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click()
    })
}

describe('Lealtad · editor en Ajustes', () => {
    before(() => {
        seedLoyalty().then((value) => {
            seed = value
        })
    })

    beforeEach(() => {
        asOwner(seed.a)
        saveProgram()
        loginOwnerUi(seed.a)
    })

    it('sin programa muestra una vista previa y "Crear mi tarjeta" abre los valores por defecto', () => {
        loginOwnerUi(seed.b)
        openEditor()
        cy.get('[data-cy="loyalty-empty"]').within(() => {
            cy.get('[data-testid="loyalty-card"]').should('be.visible')
            cy.contains('button', 'Crear mi tarjeta').click()
        })
        openSection('programa')
        cy.get('[data-cy="loyalty-stamps-required"]').should('have.value', '8')
        cy.get('[data-cy="loyalty-stamp-mode-MANUAL"]').should('have.attr', 'data-checked', 'true')
        cy.get('[data-cy="loyalty-reward-type-PERCENT"]').should(
            'have.attr',
            'data-checked',
            'true',
        )
        cy.get('[data-cy="loyalty-reward-value"]').should('have.value', '20')
        cy.get('[data-cy="loyalty-expires"]').should('not.be.checked')
        cy.get(previewCard).should('have.attr', 'aria-label', 'Tarjeta de lealtad: 3 de 8 sellos')
        cy.get('[data-cy="loyalty-save"]').should('be.enabled').and('contain', 'Crear mi tarjeta')
    })

    it('se ve el skeleton mientras carga la configuración', () => {
        cy.intercept('GET', PROGRAM_URL, (request) => {
            request.on('response', (response) => {
                response.setDelay(800)
            })
        }).as('slowProgram')
        cy.visit('/create-menu')
        cy.get('#tarjeta-de-lealtad').scrollIntoView()
        cy.get('[data-cy="loyalty-skeleton"]').should('be.visible')
        cy.wait('@slowProgram')
        cy.get('[data-cy="loyalty-skeleton"]').should('not.exist')
        cy.get(previewCard).should('be.visible')
    })

    it('cambiar la plantilla actualiza la vista previa', () => {
        openEditor()
        cy.get(previewCard).should('have.css', 'background-color', 'rgb(248, 244, 236)')
        cy.get('[data-cy="loyalty-template-oscura"]').click()
        cy.get(previewCard).should('have.css', 'background-color', 'rgb(21, 23, 28)')
        cy.get('[data-cy="loyalty-dirty"]').should('contain', 'Cambios sin guardar')
        cy.get('[data-cy="loyalty-save"]').should('be.enabled')
    })

    it('cambiar un color se refleja al instante', () => {
        openEditor()
        openSection('colores')
        cy.get('[data-cy="loyalty-color-stamp-hex"]').clear().type('#C2410C')
        cy.get(`${previewCard} [data-testid="loyalty-stamp-1"] .lc-ink-fill`).should(
            'have.css',
            'fill',
            'rgb(194, 65, 12)',
        )
    })

    it('el aviso de contraste aparece y "Corregir automáticamente" lo quita', () => {
        openEditor()
        cy.get('[data-cy="loyalty-contrast-warning"]').should('not.exist')
        openSection('colores')
        cy.get('[data-cy="loyalty-color-text-hex"]').clear().type('#EDE6D8')
        cy.get('[data-cy="loyalty-contrast-warning"]').should('contain', 'texto principal')
        // Avisa pero no bloquea el guardado.
        cy.get('[data-cy="loyalty-save"]').should('be.enabled')
        cy.get('[data-cy="loyalty-contrast-fix"]').click()
        cy.get('[data-cy="loyalty-contrast-warning"]').should('not.exist')
    })

    it('"Simular sellos" muestra cada estado, incluido el premio listo', () => {
        openEditor()
        for (const count of [0, 4, 8]) {
            setRange('[data-cy="loyalty-simulate"]', count)
            cy.get(`${previewCard} [data-filled="true"]`).should('have.length', count)
        }
        cy.get(`${previewCard} [data-testid="loyalty-progress-text"]`).should(
            'have.text',
            'Tu premio está listo',
        )
        cy.get(`${previewCard} [data-testid="loyalty-reward"]`).should(
            'have.attr',
            'data-available',
            'true',
        )
        setRange('[data-cy="loyalty-simulate"]', 5)
        cy.get(`${previewCard} [data-testid="loyalty-progress-text"]`).should(
            'have.text',
            'Te faltan 3 sellos para tu premio',
        )
    })

    it('"Probar animación" sella el siguiente espacio con el efecto elegido', () => {
        openEditor()
        openSection('animacion')
        cy.get('[data-cy="loyalty-stamp-effect-spin"]').click()
        setRange('[data-cy="loyalty-simulate"]', 2)
        cy.get('[data-cy="loyalty-test-animation"]').click()
        cy.get(`${previewCard} [data-testid="loyalty-stamp-3"]`)
            .should('have.attr', 'data-filled', 'true')
            .and('have.class', 'lc-fx-spin')
        cy.get(previewCard).should('have.attr', 'data-phase', 'stamping')
        // Termina y suelta las clases de animación (will-change solo durante la animación).
        cy.get(`${previewCard} [data-testid="loyalty-stamp-3"]`).should(
            'not.have.class',
            'lc-slot--enter',
        )
        cy.get('[data-testid="loyalty-announcement"]').should('have.text', 'Ganaste un sello')
    })

    it('con movimiento reducido no se aplican clases de movimiento', () => {
        cy.intercept('GET', PROGRAM_URL).as('getProgram')
        cy.visit('/create-menu', {
            onBeforeLoad(window) {
                const original = window.matchMedia.bind(window)
                cy.stub(window, 'matchMedia').callsFake((query: string) =>
                    query.includes('prefers-reduced-motion')
                        ? ({
                              matches: true,
                              media: query,
                              addEventListener() {},
                              removeEventListener() {},
                          } as unknown as MediaQueryList)
                        : original(query),
                )
            },
        })
        cy.get('#tarjeta-de-lealtad').scrollIntoView()
        cy.wait('@getProgram')
        cy.get('[data-cy="loyalty-test-animation"]').click()
        cy.get(previewCard).should('have.attr', 'data-reduced-motion', 'true')
        cy.get(`${previewCard} [data-testid="loyalty-stamp-4"]`)
            .should('have.class', 'lc-fx-fade')
            .and('not.have.class', 'lc-fx-press')
        cy.get(`${previewCard} .lc-ripple, ${previewCard} .lc-flash`).should('not.exist')
    })

    it('guardar y recargar conserva el diseño', () => {
        openEditor()
        cy.get('[data-cy="loyalty-template-calida"]').click()
        openSection('texto')
        cy.get('[data-cy="loyalty-title"]').clear().type('Café Roma')
        openSection('sello')
        cy.get('[data-cy="loyalty-stamp-shape-shield"]').click()
        cy.intercept('PUT', PROGRAM_URL).as('save')
        cy.get('[data-cy="loyalty-save"]').click()
        cy.wait('@save').its('response.statusCode').should('eq', 200)
        cy.get('[data-cy="loyalty-dirty"]').should('contain', 'Todo guardado')
        cy.get('[data-cy="loyalty-save"]').should('be.disabled')
        cy.reload()
        cy.get('#tarjeta-de-lealtad').scrollIntoView()
        cy.get('[data-cy="loyalty-template-calida"]').should('have.attr', 'data-checked', 'true')
        cy.get(previewCard).should('contain', 'Café Roma')
        owner('GET', '/businesses/loyalty/program')
            .its('body.program.design')
            .should((design) => {
                expect(design.template).to.eq('calida')
                expect(design.stamp.shape).to.eq('shield')
                expect(design.text.title).to.eq('Café Roma')
            })
    })

    it('salir con cambios sin guardar pide confirmación', () => {
        openEditor()
        cy.window().then((window) => {
            const event = new window.Event('beforeunload', { cancelable: true })
            window.dispatchEvent(event)
            expect(event.defaultPrevented, 'sin cambios no pregunta').to.eq(false)
        })
        cy.get('[data-cy="loyalty-template-minimal"]').click()
        cy.window().then((window) => {
            const event = new window.Event('beforeunload', { cancelable: true })
            window.dispatchEvent(event)
            expect(event.defaultPrevented, 'con cambios pregunta').to.eq(true)
        })
        cy.on('window:confirm', (message) => {
            expect(message).to.contain('cambios sin guardar')
            return false
        })
        cy.get('a[href="/dashboard"]').first().click({ force: true })
        cy.location('pathname').should('eq', '/create-menu')
    })

    it('sellos requeridos 2 y 21 dan error y no se puede guardar', () => {
        openEditor()
        openSection('programa')
        for (const value of ['2', '21']) {
            cy.get('[data-cy="loyalty-stamps-required"]').clear().type(value)
            cy.get('[data-cy="loyalty-stamps-required-error"]').should(
                'have.text',
                'Elige entre 3 y 20 sellos.',
            )
            cy.get('[data-cy="loyalty-save"]').should('be.disabled')
        }
        cy.get('[data-cy="loyalty-stamps-required"]').clear().type('10')
        cy.get('[data-cy="loyalty-stamps-required-error"]').should('not.exist')
        cy.get('[data-cy="loyalty-save"]').should('be.enabled')
        cy.get(`${previewCard} [data-testid^="loyalty-stamp-"]`).should('have.length', 10)
    })

    it('desactivar pide confirmación y conserva tarjetas y sellos', () => {
        asOwner(seed.a)
        customerWithStamps(seed.a, 3).then((customer) => {
            loginOwnerUi(seed.a)
            openEditor()
            cy.get('[data-cy="loyalty-toggle-enabled"]').click()
            cy.get('[data-testid="loyalty-disable-dialog"]')
                .should('contain', 'Las tarjetas, sellos y premios se conservan')
                .within(() => cy.get('[data-cy="loyalty-disable-confirm"]').click())
            cy.get('[data-cy="loyalty-toggle-enabled"]').should('contain', 'Activar programa')
            owner('GET', '/businesses/loyalty/program')
                .its('body.program.enabled')
                .should('eq', false)
            cardDetail(customer.id).its('body.card.stampsCount').should('eq', 3)
            cy.get('[data-cy="loyalty-toggle-enabled"]').click()
            cy.get('[data-cy="loyalty-toggle-enabled"]').should('contain', 'Pausar programa')
            owner('GET', '/businesses/loyalty/program')
                .its('body.program.enabled')
                .should('eq', true)
        })
    })

    it('un error al guardar es discreto y no borra lo editado', () => {
        openEditor()
        openSection('texto')
        cy.get('[data-cy="loyalty-title"]').clear().type('Mi café nuevo')
        cy.intercept('PUT', PROGRAM_URL, {
            statusCode: 500,
            body: { error: { code: 'INTERNAL_ERROR', message: 'x' } },
        }).as('failedSave')
        cy.get('[data-cy="loyalty-save"]').click()
        cy.wait('@failedSave')
        cy.get('[data-cy="loyalty-save-error"]').should('contain', 'Tus cambios siguen aquí')
        cy.get('[data-cy="loyalty-title"]').should('have.value', 'Mi café nuevo')
        cy.get(previewCard).should('contain', 'Mi café nuevo')
        cy.get('[data-cy="loyalty-save"]').should('be.enabled')
    })

    it('en celular la vista previa queda arriba y los controles se pliegan', () => {
        cy.viewport(390, 844)
        openEditor()
        cy.get('[data-cy="loyalty-section-toggle-plantilla"]').should(
            'have.attr',
            'aria-expanded',
            'true',
        )
        cy.get('[data-cy="loyalty-section-toggle-colores"]').should(
            'have.attr',
            'aria-expanded',
            'false',
        )
        cy.get('[data-cy="loyalty-preview"]').should('have.css', 'position', 'sticky')
        cy.get('[data-cy="loyalty-section-toggle-colores"]')
            .click()
            .should('have.attr', 'aria-expanded', 'true')
        cy.get('[data-cy="loyalty-color-bg1-hex"]').should('be.visible')
    })
})
