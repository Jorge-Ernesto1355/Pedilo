import { paymentBusinessId, paymentCard } from '../support/payment-card-fixtures'

function visitCustomers(card: unknown = paymentCard, phone = '6691234567') {
    cy.login()
    cy.intercept('GET', '**/api/v1/businesses/payment-card', { statusCode: 200, body: { paymentCard: card } }).as('customerPaymentCard')
    cy.intercept('GET', '**/api/v1/businesses/mine', { statusCode: 200, body: { business: { id: paymentBusinessId, name: 'Restaurante Cypress Transferencias' } } })
    cy.intercept('GET', '**/api/v1/businesses/*/customers*', { statusCode: 200, body: { customers: [{ id: 'customer', businessId: paymentBusinessId, name: 'Cliente Cypress', phone, isDisabled: false, orderCount: 2, totalSpent: 480 }], page: 1, limit: 10, total: 1 } }).as('customersList')
    cy.visit('/dashboard/customers'); cy.wait('@customersList')
}

describe('Tarjeta para transferencias · clientes', () => {
    it('K-01: el menú contiene Enviar tarjeta con tarjeta activa', () => { visitCustomers(); cy.get('button[aria-label="Acciones de Cliente Cypress"]').click(); cy.get('[data-cy="customer-send-transfer-card"]').should('be.visible').and('not.be.disabled') })
    it('K-02: tarjeta inexistente o de baja deshabilita la opción', () => { visitCustomers({ ...paymentCard, isActive: false }); cy.get('button[aria-label="Acciones de Cliente Cypress"]').click(); cy.get('[data-cy="customer-send-transfer-card"]').should('be.disabled') })
    it('K-03: cliente sin teléfono muestra opción deshabilitada con explicación', () => { visitCustomers(paymentCard, ''); cy.get('button[aria-label="Acciones de Cliente Cypress"]').click(); cy.get('[data-cy="customer-send-transfer-card"]').should('be.disabled').and('have.attr', 'title', 'El cliente no tiene teléfono registrado') })
    it('K-04: abre WhatsApp con tarjeta sin número de pedido ni total', () => { visitCustomers(); cy.get('button[aria-label="Acciones de Cliente Cypress"]').click(); cy.window().then((win) => cy.stub(win, 'open').as('openWhatsApp')); cy.get('[data-cy="customer-send-transfer-card"]').click(); cy.get('@openWhatsApp').should('have.been.calledOnce').then((spy) => { const url = (spy as unknown as { firstCall: { args: string[] } }).firstCall.args[0]; expect(decodeURIComponent(url)).to.contain('wa.me/526691234567').and.contain('CLABE: 012000000000000001').and.not.contain('Pedido #').and.not.contain('Total:') }) })
    it('K-05: conserva las demás acciones del menú', () => { visitCustomers(); cy.get('button[aria-label="Acciones de Cliente Cypress"]').click(); cy.contains('[role="menuitem"]', 'Editar cliente').should('be.visible'); cy.contains('[role="menuitem"]', 'Eliminar cliente').should('be.visible') })
})
