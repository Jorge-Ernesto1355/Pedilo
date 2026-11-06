const clabes: Record<string, string> = {
    Banamex: '002000000000000008', BBVA: '012000000000000001', Santander: '014000000000000009', HSBC: '021000000000000005',
    BanBajío: '030000000000000009', Inbursa: '036000000000000003', Scotiabank: '044000000000000008', Banregio: '058000000000000007',
    Afirme: '062000000000000006', Banorte: '072000000000000009', 'Banco Azteca': '127000000000000006', BanCoppel: '137000000000000009', STP: '646000000000000008', 'Mercado Pago': '722000000000000003',
}

function visitSettings(card: unknown = null) {
    cy.login()
    cy.intercept('GET', '**/api/v1/businesses/mine', { statusCode: 200, body: { business: { id: 'business-payment-card-e2e', name: 'Restaurante Cypress Transferencias' } } })
    cy.intercept('GET', '**/api/v1/businesses/payment-card', { statusCode: 200, body: { paymentCard: card } }).as('getPaymentCard')
    cy.visit('/create-menu')
    cy.get('[data-cy="payment-card-settings"]').should('be.visible')
}

function fillCard(clabe = '012000000000000001', beneficiary = 'Beneficiario Cypress') {
    cy.get('[data-cy="payment-card-clabe-input"]').clear().type(clabe)
    cy.get('[data-cy="payment-card-beneficiary-input"]').clear().type(beneficiary)
}

describe('Tarjeta para transferencias · ajustes', () => {
    it('estado de carga muestra skeleton y error controlado al fallar', () => {
        cy.login()
        cy.intercept('GET', '**/api/v1/businesses/payment-card', (request) => request.reply({ delay: 150, statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })).as('paymentCardFailure')
        cy.visit('/create-menu')
        cy.get('[data-cy="payment-card-skeleton"]').should('be.visible')
        cy.wait('@paymentCardFailure')
        cy.get('[data-cy="payment-card-load-error"]').should('contain', 'no se cargó correctamente')
        cy.get('[data-cy="payment-card-retry"]').should('be.visible')
    })

    it('S-01: aparece después de las secciones de negocio y WhatsApp', () => {
        visitSettings()
        cy.get('[data-cy="payment-card-settings"]').then(($card) => {
            const actions = $card[0].ownerDocument.querySelector('[data-cy="business-actions-panel"]')
            expect(actions).to.not.equal(null)
            expect(actions!.compareDocumentPosition($card[0]) & 4).to.not.eq(0)
        })
    })
    it('S-02: sin tarjeta muestra formulario vacío sin acciones guardadas', () => {
        visitSettings()
        cy.get('[data-cy="payment-card-clabe-input"]').should('have.value', '')
        cy.get('[data-cy="payment-card-beneficiary-input"]').should('have.value', '')
        cy.get('[data-cy="payment-card"]').should('not.exist')
        cy.get('[data-cy="payment-card-toggle"]').should('not.exist')
    })
    it('S-03: elimina letras y símbolos de la CLABE', () => {
        visitSettings()
        cy.get('[data-cy="payment-card-clabe-input"]').type('01a2-3b4 c5!')
        cy.get('[data-cy="payment-card-clabe-input"]').should('have.value', '012345')
    })
    it('S-04: muestra el contador 0/18, 10/18 y 18/18', () => {
        visitSettings()
        cy.get('[data-cy="payment-card-digit-count"]').should('contain', '0/18')
        cy.get('[data-cy="payment-card-clabe-input"]').type('0123456789')
        cy.get('[data-cy="payment-card-digit-count"]').should('contain', '10/18')
        cy.get('[data-cy="payment-card-clabe-input"]').clear().type('012000000000000001')
        cy.get('[data-cy="payment-card-digit-count"]').should('contain', '18/18')
    })
    it('S-05: rechaza CLABE corta y no permite guardar', () => {
        visitSettings(); fillCard('01234567890123456')
        cy.get('[data-cy="payment-card-clabe-error"]').should('be.visible')
        cy.get('[data-cy="payment-card-save"]').should('be.disabled')
    })
    it('S-06: rechaza verificador inválido', () => {
        visitSettings(); fillCard('012000000000000002')
        cy.get('[data-cy="payment-card-clabe-error"]').should('contain', 'verificador')
        cy.get('[data-cy="payment-card-save"]').should('be.disabled')
    })
    it('S-07: detecta BBVA y pinta la vista previa', () => {
        visitSettings(); fillCard()
        cy.get('[data-cy="payment-card"]').should('be.visible').and('have.css', 'background-color', 'rgb(0, 68, 129)')
        cy.get('[data-cy="payment-card-bank"]').should('contain', 'BBVA')
        cy.get('[data-cy="payment-card-clabe"]').should('contain', '012000000000000001')
        cy.get('[data-cy="payment-card-restaurant"]').should('contain', 'Cypress')
        cy.get('[data-cy="payment-card-beneficiary"]').should('contain', 'Beneficiario Cypress')
    })
    Object.entries(clabes).forEach(([bank, clabe]) => {
        it(`S-08: detecta correctamente ${bank}`, () => {
            visitSettings(); fillCard(clabe)
            cy.get('[data-cy="payment-card-bank"]').should('contain', bank)
        })
    })
    it('S-09: muestra Banco gris para código desconocido', () => {
        visitSettings(); fillCard('999000000000000001')
        cy.get('[data-cy="payment-card-bank"]').should('contain', 'Banco')
        cy.get('[data-cy="payment-card"]').should('have.css', 'background-color', 'rgb(91, 100, 114)')
    })
    it('S-10: rechaza beneficiario vacío', () => {
        visitSettings(); cy.get('[data-cy="payment-card-clabe-input"]').type('012000000000000001'); cy.get('[data-cy="payment-card-beneficiary-input"]').clear()
        cy.get('[data-cy="payment-card-save"]').should('be.disabled')
    })
    it('S-11: rechaza beneficiario compuesto solo por espacios', () => {
        visitSettings(); fillCard('012000000000000001', '   ')
        cy.get('[data-cy="payment-card-save"]').should('be.disabled')
    })
    it('S-12: limita beneficiario a 80 caracteres', () => {
        visitSettings(); cy.get('[data-cy="payment-card-beneficiary-input"]').type('x'.repeat(81))
        cy.get('[data-cy="payment-card-beneficiary-input"]').invoke('val').should('have.length', 80)
    })
    it('S-13: el restaurante es automático y no editable', () => {
        visitSettings(); fillCard(); cy.get('[data-cy="payment-card-restaurant"]').should('contain', 'Restaurante Cypress Transferencias'); cy.get('[data-cy="payment-card-settings"]').should('not.contain', 'Nombre del restaurante')
    })
    it('S-14: guarda una tarjeta activa y la conserva al recargar', () => {
        let saved = null as unknown
        cy.intercept('GET', '**/api/v1/businesses/payment-card', (req) => req.reply({ statusCode: 200, body: { paymentCard: saved } })).as('cardState')
        cy.intercept('PUT', '**/api/v1/businesses/payment-card', (req) => { saved = { ...req.body, bankName: 'BBVA', bankCode: '012', isActive: true }; req.reply({ statusCode: 200, body: { paymentCard: saved } }) }).as('saveCard')
        cy.login(); cy.visit('/create-menu'); cy.get('[data-cy="payment-card-settings"]').should('be.visible'); fillCard(); cy.get('[data-cy="payment-card-save"]').click(); cy.wait('@saveCard'); cy.get('[data-cy="payment-card-status"]').should('contain', 'Activa'); cy.reload(); cy.get('[data-cy="payment-card"]').should('be.visible')
    })
    it('S-15: editar permite cambiar de banco', () => {
        visitSettings(paymentCardFixture()); cy.get('[data-cy="payment-card-edit"]').click(); fillCard('014000000000000009'); cy.get('[data-cy="payment-card-bank"]').should('contain', 'Santander')
    })
    it('S-16: cancelar edición conserva la tarjeta anterior', () => {
        visitSettings(paymentCardFixture()); cy.get('[data-cy="payment-card-edit"]').click(); cy.get('[data-cy="payment-card-clabe-input"]').clear().type('014000000000000009'); cy.get('[data-cy="payment-card-edit-cancel"]').click(); cy.get('[data-cy="payment-card-clabe"]').should('contain', '012000000000000001')
    })
    it('S-17: dar de baja persiste el estado', () => {
        visitSettings(paymentCardFixture()); cy.intercept('PATCH', '**/api/v1/businesses/payment-card/status', { statusCode: 200, body: { paymentCard: { ...paymentCardFixture(), isActive: false } } }).as('disableCard'); cy.get('[data-cy="payment-card-toggle"]').click(); cy.wait('@disableCard'); cy.get('[data-cy="payment-card-status"]').should('contain', 'De baja')
    })
    it('S-18: reactiva una tarjeta dada de baja', () => {
        visitSettings({ ...paymentCardFixture(), isActive: false }); cy.intercept('PATCH', '**/api/v1/businesses/payment-card/status', { statusCode: 200, body: { paymentCard: paymentCardFixture() } }).as('enableCard'); cy.get('[data-cy="payment-card-toggle"]').click(); cy.wait('@enableCard'); cy.get('[data-cy="payment-card-status"]').should('contain', 'Activa')
    })
    it('S-19: cancelar confirmación conserva la tarjeta', () => {
        visitSettings(paymentCardFixture()); cy.on('window:confirm', () => false); cy.get('[data-cy="payment-card-delete"]').click(); cy.get('[data-cy="payment-card"]').should('be.visible')
    })
    it('S-20: eliminar confirmado deja el formulario vacío', () => {
        visitSettings(paymentCardFixture()); cy.on('window:confirm', () => true); cy.intercept('DELETE', '**/api/v1/businesses/payment-card', { statusCode: 204 }).as('deleteCard'); cy.get('[data-cy="payment-card-delete"]').click(); cy.wait('@deleteCard'); cy.get('[data-cy="payment-card-clabe-input"]').should('be.visible')
    })
    it('S-21: después de eliminar se puede registrar otra tarjeta', () => {
        visitSettings(); fillCard(); cy.intercept('PUT', '**/api/v1/businesses/payment-card', { statusCode: 200, body: { paymentCard: paymentCardFixture() } }).as('saveCard'); cy.get('[data-cy="payment-card-save"]').click(); cy.wait('@saveCard'); cy.get('[data-cy="payment-card"]').should('be.visible')
    })
    it('S-22: muestra error del servidor sin perder la captura', () => {
        visitSettings(); fillCard(); cy.intercept('PUT', '**/api/v1/businesses/payment-card', { statusCode: 500, body: { error: { message: 'error' } } }).as('saveCardError'); cy.get('[data-cy="payment-card-save"]').click(); cy.wait('@saveCardError'); cy.get('[data-cy="payment-card-error"]').should('be.visible'); cy.get('[data-cy="payment-card-clabe-input"]').should('have.value', '012000000000000001')
    })
})

function paymentCardFixture() {
    return { id: 'payment-card-e2e', clabe: '012000000000000001', beneficiaryName: 'Restaurante Cypress SA de CV', bankCode: '012', bankName: 'BBVA', isActive: true }
}
