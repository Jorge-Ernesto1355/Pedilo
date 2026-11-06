import { paymentCard, paymentBusinessId } from '../support/payment-card-fixtures'

const order = (paymentMethod: 'TRANSFER' | 'CASH', phone: string | null = '6691234567') => ({ id: `order-${paymentMethod}`, orderNumber: 42, status: 'PENDING', source: 'PUBLIC', fulfillmentType: 'DINE_IN', paymentMethod, payment_method: paymentMethod.toLowerCase(), customerId: 'customer', customerName: 'Cliente Cypress', customerPhone: phone, subtotal: 240, discountAmount: 0, total: 240, notes: null, items: [{ id: 'item', productId: 'product', productName: 'Combo', quantity: 1, unitPrice: 240, subtotal: 240, options: [] }], statusHistory: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

function visitOrders(currentOrder: ReturnType<typeof order>, card: unknown = paymentCard) {
    cy.login()
    cy.intercept('GET', '**/api/v1/businesses/payment-card', { statusCode: 200, body: { paymentCard: card } }).as('ordersPaymentCard')
    cy.intercept('GET', '**/api/v1/businesses/mine', { statusCode: 200, body: { business: { id: paymentBusinessId, name: 'Restaurante Cypress Transferencias' } } })
    cy.intercept('GET', '**/api/v1/businesses/*/orders*', { statusCode: 200, body: { orders: [currentOrder], page: 1, limit: 10, total: 1 } }).as('ordersList')
    cy.intercept('GET', '**/api/v1/businesses/settings', { statusCode: 200, body: { currency: 'MXN', timezone: 'America/Mazatlan', whatsapp: '+526691234567' } })
    cy.visit('/dashboard/orders'); cy.wait('@ordersList')
}

describe('Tarjeta para transferencias · panel de pedidos', () => {
    it('P-01: pedido transfer con tarjeta activa muestra Enviar tarjeta', () => { visitOrders(order('TRANSFER')); cy.get('[data-cy="order-send-transfer-card"]').should('be.visible') })
    it('P-02: pedido cash no muestra Enviar tarjeta', () => { visitOrders(order('CASH')); cy.get('[data-cy="order-send-transfer-card"]').should('not.exist') })
    it('P-03: tarjeta dada de baja no muestra Enviar tarjeta', () => { visitOrders(order('TRANSFER'), { ...paymentCard, isActive: false }); cy.get('[data-cy="order-send-transfer-card"]').should('not.exist') })
    it('P-04: Enviar tarjeta genera mensaje exacto al cliente', () => { visitOrders(order('TRANSFER')); cy.get('[data-cy="order-send-transfer-card"]').invoke('attr', 'href').then((href) => { const decoded = decodeURIComponent(String(href)); expect(decoded).to.contain('wa.me/526691234567').and.contain('Cliente Cypress').and.contain('Banco: BBVA').and.contain('CLABE: 012000000000000001').and.contain('Beneficiario: Restaurante Cypress SA de CV').and.contain('Pedido #42').and.contain('Total: $240.00') }) })
    it('P-05: normaliza teléfonos con formatos mexicanos', () => { visitOrders(order('TRANSFER', '(669) 123-4567')); cy.get('[data-cy="order-send-transfer-card"]').should('have.attr', 'href').and('contain', 'wa.me/526691234567') })
    it('P-06: cliente sin teléfono deja el botón deshabilitado', () => { visitOrders(order('TRANSFER', null)); cy.get('[data-cy="order-send-transfer-card-disabled"]').should('be.disabled').and('have.attr', 'title') })
    it('P-07: conserva filtros, búsqueda, actualizar, cancelar y nueva orden', () => { visitOrders(order('CASH')); cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]').should('be.visible'); cy.get('select[aria-label="Filtrar pedidos por periodo"]').should('be.visible'); cy.get('button[aria-label="Actualizar pedidos"]').should('be.visible'); cy.contains('button', '+ Nueva orden').should('be.visible'); cy.get('button[aria-label="Cancelar pedido #42"]').should('be.visible') })
})
