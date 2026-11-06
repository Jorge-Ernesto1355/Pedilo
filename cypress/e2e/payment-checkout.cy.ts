import { installPaymentPublicApi, openPaymentCheckout, paymentSlug, validBbvaClabe } from '../support/payment-card-fixtures'

function checkout(available: boolean, response?: { statusCode?: number; body?: unknown }) {
    installPaymentPublicApi({ available })
    if (response) cy.intercept('POST', '**/api/v1/businesses/*/orders', { statusCode: response.statusCode ?? 201, body: response.body ?? { order: { id: 'order-cash', orderNumber: 1, subtotal: 240, total: 240, items: [], statusHistory: [] } } }).as('createPaymentOrder')
    cy.visit(`/${paymentSlug}`)
    cy.wait('@paymentCatalog')
    openPaymentCheckout()
}

describe('Tarjeta para transferencias · checkout', () => {
    it('C-01: sin tarjeta no muestra selector de pago', () => { checkout(false); cy.get('[data-cy="payment-method-selector"]').should('not.exist') })
    it('C-02: tarjeta de baja se comporta como inexistente', () => { checkout(false); cy.get('[data-cy="payment-method-selector"]').should('not.exist') })
    it('C-03: tarjeta activa muestra Efectivo y Transferencia con Efectivo por defecto', () => { checkout(true); cy.get('[data-cy="payment-method-selector"]').should('be.visible'); cy.get('[data-cy="payment-method-cash"]').should('be.checked'); cy.get('[data-cy="payment-method-transfer"]').should('be.visible') })
    it('C-04: nunca pregunta pagar ahora o después', () => { checkout(true); cy.get('[role="dialog"]').should('not.contain', 'pagar ahora').and('not.contain', 'después') })
    it('C-05: nunca muestra pregunta de cambio en efectivo', () => { checkout(true); cy.get('[role="dialog"]').should('not.contain', '¿con cuánto pagas?') })
    it('C-06: sin tarjeta crea el pedido en efectivo por omisión', () => { checkout(false); cy.contains('button', 'Confirmar pedido').click(); cy.wait('@createPaymentOrder').its('request.body').should('not.have.property', 'paymentMethod') })
    it('C-07: con tarjeta y Efectivo crea el pedido en efectivo', () => { checkout(true); cy.get('[data-cy="payment-method-cash"]').check(); cy.contains('button', 'Confirmar pedido').click(); cy.wait('@createPaymentOrder').its('request.body').should('not.have.property', 'paymentMethod') })
    it('C-08: con tarjeta y Transferencia crea el pedido por transferencia', () => { checkout(true); cy.get('[data-cy="payment-method-transfer"]').check(); cy.contains('button', 'Confirmar pedido').click(); cy.wait('@createPaymentOrder').its('request.body.paymentMethod').should('eq', 'TRANSFER') })
    it('C-09: si la tarjeta deja de estar disponible muestra error controlado', () => { checkout(true, { statusCode: 400, body: { error: { code: 'PAYMENT_CARD_UNAVAILABLE', message: 'unavailable' } } }); cy.get('[data-cy="payment-method-transfer"]').check(); cy.contains('button', 'Confirmar pedido').click(); cy.wait('@createPaymentOrder'); cy.get('[role="dialog"]').should('contain', 'tarjeta para transferencias').and('contain', 'efectivo') })
    it('C-10: nunca expone la CLABE antes de crear el pedido', () => { checkout(true); cy.get('body').should('not.contain', validBbvaClabe) })
})
