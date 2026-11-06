export const paymentBusinessId = 'business-payment-card-e2e'
export const paymentSlug = 'restaurante-payment-card-e2e'
export const validBbvaClabe = '012000000000000001'
export const validUnknownClabe = '999000000000000001'

export const paymentCard = {
    id: 'payment-card-e2e',
    clabe: validBbvaClabe,
    beneficiaryName: 'Restaurante Cypress SA de CV',
    beneficiary_name: 'Restaurante Cypress SA de CV',
    bankCode: '012',
    bankName: 'BBVA',
    isActive: true,
    is_active: true,
}

export const paymentCatalog = (available = true) => ({
    business: {
        id: paymentBusinessId,
        name: 'Restaurante Cypress Transferencias',
        slug: paymentSlug,
        description: 'Menú de pruebas de transferencias.',
        logoUrl: null,
        logoBlurUrl: null,
        coverUrl: null,
        coverBlurUrl: null,
        ubication: 'Mazatlán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: null,
        whatsappNumber: '+52 669 123 4567',
        paymentCardAvailable: available,
        payment_card_available: available,
    },
    menus: [{
        id: 'menu-payment-card-e2e', businessId: paymentBusinessId, name: 'Menú', description: null, isActive: true,
        categories: [{
            id: 'category-payment-card-e2e', businessId: paymentBusinessId, menuId: 'menu-payment-card-e2e', name: 'Platillos', description: null, sortOrder: 0, isActive: true,
            products: [{ id: 'product-payment-card-e2e', businessId: paymentBusinessId, categoryId: 'category-payment-card-e2e', name: 'Combo de prueba', description: 'Producto de pruebas.', price: 240, imageUrl: null, sortOrder: 0, isAvailable: true, optionGroups: [] }],
        }],
    }],
})

export function installPaymentPublicApi({ available = true, orderBody }: { available?: boolean; orderBody?: unknown } = {}) {
    cy.intercept('GET', `**/api/v1/public/businesses/${paymentSlug}/catalog`, { statusCode: 200, body: paymentCatalog(available) }).as('paymentCatalog')
    cy.intercept('POST', `**/api/v1/businesses/${paymentBusinessId}/orders`, { statusCode: 201, body: { order: orderBody ?? { id: 'order-payment-card-e2e', orderNumber: 42, status: 'PENDING', customerId: 'customer-payment-card-e2e', customerName: 'Cliente Cypress', customerPhone: '6691234567', subtotal: 240, total: 204, discountAmount: 36, fulfillmentType: 'DINE_IN', paymentMethod: 'TRANSFER', payment_method: 'transfer', items: [], statusHistory: [], transferCard: { clabe: validBbvaClabe, beneficiaryName: paymentCard.beneficiaryName, bankCode: '012', bankName: 'BBVA', restaurantName: 'Restaurante Cypress Transferencias' } } } }).as('createPaymentOrder')
}

export function openPaymentCheckout() {
    cy.contains('article', 'Combo de prueba').within(() => cy.contains('button', 'Agregar al carrito').click())
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type('Cliente Cypress')
    cy.get('#customer-phone').type('6691234567')
}
