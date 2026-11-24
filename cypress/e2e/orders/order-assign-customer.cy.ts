import { assertDialogFitsViewport, assertPageFitsViewport } from '../../support/responsive'

/**
 * Asignar cliente desde el detalle de una orden sin cliente (AssignOrderCustomerModal).
 * Toda la API se simula con cy.intercept; solo se usa cy.login() para tener sesión.
 */

type Json = Record<string, unknown>

const orderId = 'order-assign-customer-cypress'
const customers = [
    { id: 'customer-maria', name: 'María López', phone: '6691112233' },
    { id: 'customer-marcos', name: 'Marcos Ruiz', phone: '6694445566' },
]

function makeOrder(overrides: Json = {}) {
    return {
        id: orderId,
        orderNumber: 731,
        version: 3,
        status: 'PENDING',
        customerId: null,
        customerName: null,
        customerPhone: null,
        fulfillmentType: 'DINE_IN',
        paymentMethod: 'CASH',
        subtotal: 100,
        discountAmount: 0,
        total: 100,
        items: [
            {
                id: 'item-assign-1',
                productId: 'product-assign-1',
                productName: 'Hamburguesa',
                quantity: 2,
                unitPrice: 50,
                unitPriceFinal: 50,
                subtotal: 100,
                options: [{ id: 'opt-1', name: 'Queso', price: 0 }],
            },
        ],
        statusHistory: [],
        createdAt: '2026-11-10T12:00:00.000Z',
        updatedAt: '2026-11-10T12:00:00.000Z',
        ...overrides,
    }
}

function installApi(order: Json = {}, updateReply?: { statusCode: number; body: unknown }) {
    let current: Json = makeOrder(order)
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: { currency: 'MXN', timezone: 'America/Mazatlan' },
    })
    cy.intercept('GET', '**/businesses/payment-card', { statusCode: 404, body: {} })
    cy.intercept('GET', `**/businesses/orders/${orderId}`, (request) => {
        request.reply({ statusCode: 200, body: { order: current } })
    }).as('orderDetail')
    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        if (url.pathname.endsWith(`/orders/${orderId}`)) return
        if (url.searchParams.get('limit') === '1') {
            request.reply({ statusCode: 200, body: { orders: [], page: 1, limit: 1, total: 0 } })
            return
        }
        request.alias = 'ordersList'
        request.reply({
            statusCode: 200,
            body: { orders: [current], page: 1, limit: 10, total: 1 },
        })
    })
    cy.intercept('GET', '**/businesses/*/customers*', (request) => {
        const search = (new URL(request.url).searchParams.get('search') ?? '').toLowerCase()
        const matches = customers.filter(
            (customer) =>
                customer.name.toLowerCase().includes(search) || customer.phone.includes(search),
        )
        request.reply({
            statusCode: 200,
            body: { customers: matches, page: 1, limit: 8, total: matches.length },
        })
    }).as('customers')
    cy.intercept('PATCH', `**/businesses/orders/${orderId}`, (request) => {
        if (updateReply) {
            request.reply(updateReply)
            return
        }
        const picked = customers.find((customer) => customer.id === request.body.customerId)
        current = {
            ...current,
            version: Number(current.version) + 1,
            customerId: picked?.id ?? null,
            customerName: picked?.name ?? null,
            customerPhone: picked?.phone ?? null,
        }
        request.reply({ statusCode: 200, body: { order: current } })
    }).as('updateOrder')
}

function openDetail(order: Json = {}, updateReply?: { statusCode: number; body: unknown }) {
    cy.login()
    cy.then(() => installApi(order, updateReply))
    cy.visit('/dashboard/orders')
    cy.wait('@ordersList')
    cy.contains('article', '#731').find('button').contains('#731').click()
    cy.wait('@orderDetail')
    cy.get('[aria-labelledby="order-detail-title"]').should('be.visible')
}

const detail = () => cy.get('[aria-labelledby="order-detail-title"]')
const assignLink = () => cy.get('[data-cy="order-detail-assign-customer"]')
const assignModal = () => cy.get('[data-cy="assign-order-customer-modal"]')
const saveButton = () => cy.get('[data-cy="assign-order-customer-save"]')

describe('Orders · asignar cliente desde el detalle', () => {
    it('ofrece "Seleccionar cliente" debajo de "Cliente sin nombre" y guarda solo el cliente', () => {
        openDetail()
        detail().contains('Cliente sin nombre').should('be.visible')
        assignLink().should('have.text', 'Seleccionar cliente').click()

        assignModal().should('be.visible')
        saveButton().should('be.disabled')

        assignModal().find('input[aria-label="Buscar cliente para la orden"]').type('Mar')
        cy.wait('@customers')
        assignModal().contains('button', 'María López').click()
        assignModal().contains('María López').should('be.visible')
        saveButton().should('not.be.disabled').click()

        cy.wait('@updateOrder').then(({ request }) => {
            expect(request.body.customerId).to.eq('customer-maria')
            expect(request.body.expectedVersion).to.eq(3)
            expect(request.body.paymentMethod).to.eq('CASH')
            // Productos tal cual: sin optionIds ni comboChoiceIds, la edición los conserva.
            expect(request.body.items).to.deep.eq([
                { id: 'item-assign-1', productId: 'product-assign-1', quantity: 2 },
            ])
        })
        assignModal().should('not.exist')
        detail().contains('María López').should('be.visible')
        assignLink().should('not.exist')
    })

    it('Quitar permite elegir a otro cliente antes de guardar', () => {
        openDetail()
        assignLink().click()
        assignModal().find('input[aria-label="Buscar cliente para la orden"]').type('Mar')
        cy.wait('@customers')
        assignModal().contains('button', 'María López').click()
        assignModal().contains('button', 'Quitar').click()
        saveButton().should('be.disabled')
    })

    it('Cancelar cierra el modal sin guardar', () => {
        openDetail()
        assignLink().click()
        assignModal().contains('button', 'Cancelar').click()
        assignModal().should('not.exist')
        detail().contains('Cliente sin nombre').should('be.visible')
        cy.get('@updateOrder.all').should('have.length', 0)
    })

    it('muestra el error del servidor y deja reintentar', () => {
        openDetail({}, { statusCode: 409, body: { error: { code: 'ORDER_VERSION_CONFLICT' } } })
        assignLink().click()
        assignModal().find('input[aria-label="Buscar cliente para la orden"]').type('Mar')
        cy.wait('@customers')
        assignModal().contains('button', 'Marcos Ruiz').click()
        saveButton().click()
        cy.wait('@updateOrder')
        assignModal().find('[role="alert"]').should('contain', 'modificada en otra sesión')
        saveButton().should('not.be.disabled')
    })

    it('no ofrece asignar cuando la orden ya tiene cliente', () => {
        openDetail({ customerId: 'customer-maria', customerName: 'María López' })
        detail().contains('María López').should('be.visible')
        assignLink().should('not.exist')
    })

    it('no ofrece asignar cuando la orden ya no es editable', () => {
        openDetail({ status: 'READY' })
        detail().contains('Cliente sin nombre').should('be.visible')
        assignLink().should('not.exist')
    })

    it('cabe en móvil sin desbordar', () => {
        cy.viewport(375, 667)
        openDetail()
        assignLink().click()
        assertDialogFitsViewport('[data-cy="assign-order-customer-modal"]')
        assertPageFitsViewport()
        saveButton().should('be.visible')
    })
})
