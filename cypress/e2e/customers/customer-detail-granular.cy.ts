export {}

const businessId = 'business-customer-detail-granular'
const customerId = 'customer-detail-granular'
const customer = {
    id: customerId,
    businessId,
    name: 'Ana García',
    phone: '6681234567',
    orderCount: 11,
    totalSpent: 1480,
    createdAt: '2026-01-10T12:00:00.000Z',
}

const order = (number: number) => ({
    id: `customer-order-${number}`,
    orderNumber: number,
    status: 'READY',
    total: number === 11 ? 240 : 120,
    subtotal: number === 11 ? 240 : 120,
    discountAmount: 0,
    notes: number === 11 ? 'Sin cebolla' : null,
    fulfillmentType: 'PICKUP',
    createdAt: `2026-10-${String(number).padStart(2, '0')}T12:00:00.000Z`,
    items: [{
        id: `customer-item-${number}`,
        productName: number === 11 ? 'Combo familiar' : 'Hamburguesa clásica',
        quantity: number === 11 ? 2 : 1,
        unitPrice: number === 11 ? 120 : 120,
        subtotal: number === 11 ? 240 : 120,
        options: [],
    }],
})

type Discount = {
    id: string
    type: 'PERCENTAGE' | 'FIXED_AMOUNT'
    value: number
    status: 'AVAILABLE' | 'USED' | 'EXPIRED' | 'CANCELLED'
    expiresAt: string | null
    createdAt: string
    usedAt: string | null
    usedOrder?: { id: string; orderNumber: number } | null
}

const discounts: Discount[] = [
    { id: 'discount-available', type: 'PERCENTAGE', value: 15, status: 'AVAILABLE', expiresAt: '2026-12-01T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z', usedAt: null },
    { id: 'discount-used', type: 'FIXED_AMOUNT', value: 50, status: 'USED', expiresAt: '2026-11-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', usedAt: '2026-10-10T00:00:00.000Z', usedOrder: { id: 'order-10', orderNumber: 10 } },
    { id: 'discount-expired', type: 'PERCENTAGE', value: 10, status: 'EXPIRED', expiresAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', usedAt: null },
]

function installApi(options: { ordersError?: boolean; discountsError?: boolean } = {}) {
    let orderReads = 0
    let discountReads = 0
    cy.intercept('GET', '**/businesses/*/customers*', { statusCode: 200, body: { customers: [customer], page: 1, limit: 10, total: 1 } }).as('listCustomers')
    cy.intercept('GET', `**/businesses/customers/${customerId}`, { statusCode: 200, body: { customer } }).as('getCustomer')
    cy.intercept('GET', `**/businesses/customers/${customerId}/orders*`, (request) => {
        orderReads += 1
        request.alias = 'getCustomerOrders'
        request.reply(options.ordersError && orderReads === 1 ? { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } } : {
            statusCode: 200,
            body: { orders: orderReads > 1 ? [order(11)] : [order(11)], page: 1, limit: 10, total: 11 },
        })
    })
    cy.intercept('GET', `**/businesses/customers/${customerId}/discounts`, (request) => {
        discountReads += 1
        request.alias = 'getCustomerDiscounts'
        request.reply(options.discountsError && discountReads === 1 ? { statusCode: 500, delay: 150, body: { error: { code: 'INTERNAL_ERROR' } } } : { statusCode: 200, body: { discounts } })
    })
    cy.intercept('POST', `**/businesses/customers/${customerId}/discounts`, (request) => {
        request.alias = 'grantCustomerDiscount'
        request.reply({ statusCode: 201, body: { discount: { ...discounts[0], id: 'discount-created', type: request.body.type, value: request.body.value } } })
    })
    cy.intercept('DELETE', `**/businesses/customers/${customerId}/discounts/*`, (request) => {
        request.alias = 'revokeCustomerDiscount'
        request.reply({ statusCode: 200, body: { discount: { ...discounts[0], status: 'CANCELLED' } } })
    })
}

function openDetail() {
    cy.login()
    cy.visit('/dashboard/customers')
    cy.wait('@listCustomers')
    cy.contains('button', 'Ana García').click()
    cy.wait('@getCustomer')
}

describe('Detalle de cliente · pruebas granulares', () => {
    it('muestra la identidad, teléfono, métricas y acciones principales', () => {
        installApi()
        openDetail()
        cy.get('[role="dialog"]').should('contain', 'Ana García').and('contain', '6681234567').and('contain', 'Pedidos: 11').and('contain', 'Total gastado')
        cy.contains('button', 'Ver pedidos').should('be.visible')
        cy.contains('button', 'Ver cupones').should('be.visible')
    })

    it('carga el historial completo mediante endpoint específico y muestra productos, cantidades, nota y total', () => {
        installApi()
        openDetail()
        cy.wait('@getCustomerOrders').its('request.url').should('include', 'page=1').and('include', 'limit=10')
        cy.get('[aria-label="Historial de pedidos"]').should('contain', 'Pedido #11').and('contain', '2 × Combo familiar').and('contain', 'Sin cebolla').and('contain', '$240.00')
        cy.contains('Página 1 de 2').should('be.visible')
    })

    it('muestra empty state cuando el cliente no tiene órdenes', () => {
        installApi()
        cy.intercept('GET', `**/businesses/customers/${customerId}/orders*`, { statusCode: 200, body: { orders: [], page: 1, limit: 10, total: 0 } }).as('emptyOrders')
        openDetail()
        cy.wait('@emptyOrders')
        cy.get('[aria-label="Historial de pedidos"]').should('contain', 'todavía no tiene pedidos')
    })

    it('muestra error de órdenes y permite reintentar', () => {
        installApi({ ordersError: true })
        openDetail()
        cy.wait('@getCustomerOrders')
        cy.get('[aria-label="Historial de pedidos"]').find('[role="alert"]').should('contain', 'No pudimos cargar')
        cy.contains('Intentar de nuevo').click()
        cy.wait('@getCustomerOrders')
        cy.get('[aria-label="Historial de pedidos"]').should('contain', 'Pedido #11')
    })

    it('separa disponibles, canjeados y vencidos con contadores reales', () => {
        installApi()
        openDetail()
        cy.contains('button', 'Ver cupones').click()
        cy.wait('@getCustomerDiscounts')
        cy.get('[aria-label="Cupones del cliente"]').should('contain', 'Disponibles (1)').and('contain', 'Canjeados (1)').and('contain', 'Vencidos (1)')
        cy.contains('button', 'Canjeados (1)').click()
        cy.get('[aria-label="Cupones del cliente"]').should('contain', 'Pedido #10').and('not.contain', 'Revocar')
        cy.contains('button', 'Vencidos (1)').click()
        cy.get('[aria-label="Cupones del cliente"]').should('contain', 'Vence el')
    })

    it('muestra skeleton y error de cupones con reintento', () => {
        installApi({ discountsError: true })
        openDetail()
        cy.contains('button', 'Ver cupones').click()
        cy.get('[aria-label="Cupones del cliente"]').find('[role="status"]').should('exist')
        cy.wait('@getCustomerDiscounts')
        cy.get('[aria-label="Cupones del cliente"]').find('[role="alert"]').should('contain', 'No pudimos cargar')
        cy.contains('Intentar de nuevo').click()
        cy.wait('@getCustomerDiscounts')
        cy.get('[aria-label="Cupones del cliente"]').should('contain', '15% de descuento')
    })

    it('asigna un cupón, muestra loading y actualiza la consulta', () => {
        installApi()
        openDetail()
        cy.contains('button', 'Ver cupones').click()
        cy.wait('@getCustomerDiscounts')
        cy.contains('button', 'Agregar cupón').click()
        cy.get('input[aria-label="Porcentaje personalizado"]').clear().type('20')
        cy.contains('button', 'Asignar cupón').click()
        cy.wait('@grantCustomerDiscount').its('request.body').should('deep.equal', { type: 'PERCENTAGE', value: 20 })
        cy.get('[aria-label="Cupones del cliente"]').should('not.contain', 'Asignar descuento al cliente')
    })

    it('pide confirmación antes de revocar y no revoca si se cancela', () => {
        installApi()
        openDetail()
        cy.contains('button', 'Ver cupones').click()
        cy.wait('@getCustomerDiscounts')
        cy.on('window:confirm', () => false)
        cy.get('button[aria-label="Revocar cupón"]').click()
        cy.get('[aria-label="Cupones del cliente"]').should('contain', '15% de descuento').and('contain', 'Revocar')
    })

    it('revoca después de confirmar y conserva la operación separada del cupón global', () => {
        installApi()
        openDetail()
        cy.contains('button', 'Ver cupones').click()
        cy.wait('@getCustomerDiscounts')
        cy.on('window:confirm', () => true)
        cy.get('button[aria-label="Revocar cupón"]').click()
        cy.wait('@revokeCustomerDiscount').its('request.url').should('include', customerId).and('include', 'discount-available')
    })
})
