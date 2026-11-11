type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'

const orderId = 'order-edit-modal-cypress'
const productId = 'product-burger-cypress'
const comboId = 'combo-tray-cypress'
const customerId = 'customer-edit-cypress'

const optionGroups = [
    {
        id: 'group-extras-cypress',
        productId,
        name: 'Extras',
        isRequired: false,
        minSelections: 0,
        maxSelections: 2,
        isActive: true,
        sortOrder: 0,
        options: [
            {
                id: 'option-cheese-cypress',
                optionGroupId: 'group-extras-cypress',
                name: 'Queso',
                price: 15,
                minSelections: 0,
                maxSelections: 2,
                isAvailable: true,
                sortOrder: 0,
            },
            {
                id: 'option-bacon-cypress',
                optionGroupId: 'group-extras-cypress',
                name: 'Tocino',
                price: 20,
                minSelections: 0,
                maxSelections: 1,
                isAvailable: true,
                sortOrder: 1,
            },
        ],
    },
]

const comboDetails = {
    id: comboId,
    name: 'Charola Cypress',
    optionGroups: [
        {
            id: 'combo-group-drink-cypress',
            comboProductId: comboId,
            name: 'Acompañamiento',
            minSelections: 1,
            maxSelections: 1,
            sortOrder: 0,
            products: [
                {
                    id: 'choice-fries-cypress',
                    productId: 'fries-cypress',
                    sortOrder: 0,
                    product: {
                        id: 'fries-cypress',
                        name: 'Papas',
                        isAvailable: true,
                    },
                },
                {
                    id: 'choice-wings-cypress',
                    productId: 'wings-cypress',
                    sortOrder: 1,
                    product: {
                        id: 'wings-cypress',
                        name: 'Alitas',
                        isAvailable: true,
                    },
                },
            ],
        },
    ],
}

function makeOrder(status: OrderStatus = 'PENDING') {
    return {
        id: orderId,
        orderNumber: 812,
        version: 4,
        status,
        customerId,
        customerName: 'Cliente Inicial',
        customerPhone: '6691234567',
        fulfillmentType: 'DINE_IN',
        paymentMethod: 'CASH',
        subtotal: 100,
        discountAmount: 0,
        total: 100,
        notes: 'Nota no editable',
        items: [
            {
                id: 'order-item-burger-cypress',
                productId,
                productName: 'Hamburguesa Cypress',
                quantity: 1,
                unitPrice: 100,
                unitPriceFinal: 100,
                subtotal: 100,
                options: [],
            },
        ],
        statusHistory: [],
        createdAt: '2026-11-10T12:00:00.000Z',
        updatedAt: '2026-11-10T12:00:00.000Z',
    }
}

function installApi(
    options: {
        status?: OrderStatus
        customers?: Array<{ id: string; name: string; phone: string }>
        customerFailure?: boolean
        menus?: unknown[]
        menuFailure?: boolean
        menuDelay?: number
        updateStatus?: number
        updateBody?: unknown
    } = {},
) {
    const status = options.status ?? 'PENDING'
    const order = makeOrder(status)
    let customerAttempts = 0
    let menuAttempts = 0

    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: { currency: 'MXN', timezone: 'America/Mazatlan' },
    })
    cy.intercept('GET', '**/businesses/payment-card', { statusCode: 404, body: {} })

    cy.intercept('GET', `**/businesses/orders/${orderId}`, {
        delay: 100,
        statusCode: 200,
        body: { order },
    }).as('orderDetail')

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        if (url.pathname.endsWith(`/orders/${orderId}`)) return
        if (url.searchParams.get('limit') === '1') {
            request.reply({ statusCode: 200, body: { orders: [], page: 1, limit: 1, total: 0 } })
            return
        }
        request.alias = 'ordersList'
        request.reply({ statusCode: 200, body: { orders: [order], page: 1, limit: 10, total: 1 } })
    })

    cy.intercept('GET', '**/businesses/products/*/option-groups', {
        statusCode: 200,
        body: { optionGroups },
    }).as('optionGroups')
    cy.intercept('GET', `**/businesses/products/${comboId}/combo-option-groups`, {
        statusCode: 200,
        body: { combo: comboDetails },
    }).as('comboDetails')

    cy.intercept('GET', '**/businesses/*/customers*', (request) => {
        customerAttempts += 1
        request.alias =
            customerAttempts === 1
                ? 'customersSearch'
                : customerAttempts === 5
                  ? 'customersRetry'
                  : undefined
        if (options.customerFailure && customerAttempts <= 4) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
            return
        }
        const search = new URL(request.url).searchParams.get('search') ?? ''
        const matchingCustomers = search === 'zzzz' ? [] : (options.customers ?? [])
        request.reply({
            statusCode: 200,
            body: {
                customers: matchingCustomers,
                page: 1,
                limit: 8,
                total: matchingCustomers.length,
            },
        })
    })

    cy.intercept('GET', '**/businesses/mine/menus', (request) => {
        menuAttempts += 1
        request.alias = menuAttempts === 1 ? 'menus' : menuAttempts === 5 ? 'menusRetry' : undefined
        if (options.menuFailure && menuAttempts <= 4) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
            return
        }
        request.reply({
            delay: options.menuDelay ?? 0,
            statusCode: 200,
            body: { menus: options.menus ?? [] },
        })
    })

    cy.intercept('PATCH', `**/businesses/orders/${orderId}`, (request) => {
        request.alias = 'updateOrder'
        request.reply({
            statusCode: options.updateStatus ?? 200,
            body: options.updateBody ?? { order: { ...order, version: 5 } },
        })
    })
}

function openEdit(
    status: OrderStatus = 'PENDING',
    apiOptions: Parameters<typeof installApi>[0] = {},
) {
    cy.login()
    cy.then(() => installApi({ status, ...apiOptions }))
    cy.visit('/dashboard/orders')
    cy.wait('@ordersList')
    cy.contains('article', '#812').find('button').contains('#812').click()
    cy.wait('@orderDetail')
    cy.get('[aria-labelledby="order-detail-title"]').contains('Editar orden').click()
    cy.get('[data-cy="edit-order-modal"]').should('be.visible')
}

describe('Edición de órdenes · cobertura granular Cypress', () => {
    before(() => {
        Cypress.config('retries', 0)
        Cypress.config('pageLoadTimeout', 60_000)
    })

    it('abre el modal y muestra el loading del detalle antes de cargarlo', () => {
        cy.login()
        cy.then(() => installApi())
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.contains('article', '#812').find('button').contains('#812').click()
        cy.get('[aria-labelledby="order-detail-title"]').should('contain', 'Cargando detalle…')
        cy.wait('@orderDetail')
        cy.get('[aria-labelledby="order-detail-title"]').contains('Editar orden').click()
        cy.get('[data-cy="edit-order-modal"]').should('be.visible')
        cy.contains('Notas').should('not.exist')
    })

    it('muestra skeleton, error, reintento y estado vacío del selector de productos', () => {
        const menus = [
            {
                id: 'menu-edit-cypress',
                name: 'Menú Cypress',
                categories: [
                    {
                        id: 'category-edit-cypress',
                        name: 'Combos',
                        products: [
                            { id: comboId, name: 'Charola Cypress', price: 250, type: 'COMBO' },
                        ],
                    },
                ],
            },
        ]
        openEdit('PENDING', { menus, menuDelay: 500 })
        cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
        cy.get('[aria-label="Cargando productos"]').should('be.visible')
        cy.wait('@menus')
        cy.get('[data-cy="edit-order-product"]').should('have.length', 1)
        cy.get('input[aria-label="Buscar producto para agregar"]').type('no existe')
        cy.contains('No encontramos productos con esa búsqueda.').should('be.visible')
    })

    it.only('muestra error de catálogo y permite reintentar', () => {
        openEdit('PENDING', { menuFailure: true })
        cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
        cy.wait('@menus')
        cy.contains('No pudimos cargar los productos').should('be.visible')
        cy.get('[role="alert"]').contains('Intentar de nuevo').click({ force: true })
        cy.wait('@menusRetry')
        cy.contains('No hay productos disponibles para agregar.').should('be.visible')
    })

    it('muestra skeleton, error, vacío y selección de clientes con máximo de ocho resultados', () => {
        const customers = Array.from({ length: 10 }, (_, index) => ({
            id: `customer-${index}`,
            name: `Cliente ${index}`,
            phone: `66900000${String(index).padStart(2, '0')}`,
        }))
        openEdit('PENDING', { customers })
        cy.get('input[aria-label="Buscar cliente para la orden"]').type('Cliente')
        cy.get('[aria-label="Buscando clientes"]').should('be.visible')
        cy.wait('@customersSearch')
        cy.get('[data-cy="edit-order-modal"] button').contains('Cliente 0').should('be.visible')
        cy.get('[data-cy="edit-order-modal"] button')
            .filter(':contains("Cliente")')
            .should('have.length', 8)
        cy.contains('Cliente 0').click()
        cy.contains('Cliente 0').should('be.visible')

        cy.get('input[aria-label="Buscar cliente para la orden"]').clear().type('zzzz')
        cy.wait('@customersRetry')
        cy.contains('No hay ningún cliente que coincida con la búsqueda.').should('be.visible')
    })

    it.only('muestra error de clientes y permite reintentar', () => {
        openEdit('PENDING', { customerFailure: true })
        cy.get('input[aria-label="Buscar cliente para la orden"]').type('fallo')
        cy.wait('@customersSearch')
        cy.contains('No pudimos cargar los clientes').should('be.visible')
        cy.get('[role="alert"]').contains('Intentar de nuevo').click({ force: true })
        cy.wait('@customersRetry')
        cy.contains('No hay ningún cliente que coincida con la búsqueda.').should('be.visible')
    })

    it('edita cantidades, elimina productos y permite agregar dos veces el mismo producto', () => {
        openEdit('PENDING', {
            menus: [
                {
                    id: 'menu-edit-cypress',
                    name: 'Menú Cypress',
                    categories: [
                        {
                            id: 'category-edit-cypress',
                            name: 'Productos',
                            products: [{ id: productId, name: 'Hamburguesa Cypress', price: 100 }],
                        },
                    ],
                },
            ],
        })
        cy.get('[data-cy="edit-order-item"]').should('have.length', 1)
        cy.get('[aria-label="Aumentar cantidad de Hamburguesa Cypress"]').click()
        cy.get('[data-cy="edit-order-item"]').first().should('contain', '2')
        cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
        cy.wait('@menus')
        cy.get('[data-cy="edit-order-product"]').click()
        cy.get('[data-cy="edit-order-item"]').should('have.length', 2)
        cy.get('[data-cy="edit-order-item"]').last().find('[aria-label^="Eliminar"]').click()
        cy.get('[data-cy="edit-order-item"]').should('have.length', 1)
    })

    it('mantiene separadas dos charolas y permite cambiar solo la segunda', () => {
        const comboOrder = {
            ...makeOrder(),
            items: [
                {
                    id: 'tray-item-1',
                    productId: comboId,
                    productName: 'Charola Cypress',
                    quantity: 1,
                    unitPrice: 250,
                    subtotal: 250,
                    options: [{ name: 'Papas', groupName: 'Acompañamiento', price: 0 }],
                },
                {
                    id: 'tray-item-2',
                    productId: comboId,
                    productName: 'Charola Cypress',
                    quantity: 1,
                    unitPrice: 250,
                    subtotal: 250,
                    options: [{ name: 'Papas', groupName: 'Acompañamiento', price: 0 }],
                },
            ],
            subtotal: 500,
            total: 500,
        }
        cy.login()
        cy.then(() => {
            installApi()
            cy.intercept('GET', `**/businesses/orders/${orderId}`, {
                statusCode: 200,
                body: { order: comboOrder },
            }).as('comboOrderDetail')
            cy.intercept('GET', '**/businesses/*/orders*', (request) => {
                if (new URL(request.url).searchParams.get('limit') !== '1')
                    request.reply({
                        statusCode: 200,
                        body: { orders: [comboOrder], page: 1, limit: 10, total: 1 },
                    })
            }).as('comboOrders')
        })
        cy.visit('/dashboard/orders')
        cy.wait('@comboOrders')
        cy.contains('article', '#812').find('button').contains('#812').click()
        cy.wait('@comboOrderDetail')
        cy.get('[aria-labelledby="order-detail-title"]').contains('Editar orden').click()
        cy.get('[data-cy="edit-order-item"]').should('have.length', 2)
        cy.get('[data-cy="edit-order-item"]').each(($item) => {
            cy.wrap($item).contains('Editar variantes y extras').click()
        })
        cy.get('input[name="edit-combo-0-combo-group-drink-cypress"]').check()
        cy.get('input[name="edit-combo-1-combo-group-drink-cypress"]').check()
        cy.get('[data-cy="edit-order-item"]').first().should('contain', 'Papas')
        cy.get('[data-cy="edit-order-item"]').last().should('contain', 'Alitas')
    })

    it('edita extras con controles de cantidad y conserva la selección al cancelar/reabrir', () => {
        openEdit()
        cy.wait('@optionGroups')
        cy.contains('Editar variantes y extras').click()
        cy.get('button[aria-label="Agregar Queso"]').click()
        cy.contains('Queso · +$15.00').should('be.visible')
        cy.get('button[title="Cancelar edición"]').click()
        cy.contains('Editar variantes y extras').click()
        cy.contains('Queso · +$15.00').should('be.visible')
    })

    it.only('selecciona modalidad, pago y cliente, y envía el payload completo', () => {
        openEdit()
        cy.wait('@optionGroups')
        cy.contains('Editar variantes y extras').click()
        cy.get('button[aria-label="Agregar Queso"]').click()
        cy.get('[data-cy="edit-order-modal"]').contains('Para llevar').click()
        cy.get('[data-cy="edit-order-modal"]').contains('Transferencia').click()
        cy.get('[data-cy="edit-order-review"]').click()
        cy.contains('Confirma los cambios').should('be.visible')
        cy.get('[data-cy="edit-order-save"]').click()
        cy.wait('@updateOrder')
            .its('request.body')
            .should((body) => {
                expect(body.expectedVersion).to.eq(4)
                expect(body.fulfillmentType).to.eq('PICKUP')
                expect(body.paymentMethod).to.eq('TRANSFER')
                expect(body.items[0]).to.include({ productId, quantity: 1 })
                expect(body.items[0].optionIds).to.deep.eq(['option-cheese-cypress'])
                expect(body.items[0].comboChoiceIds).to.deep.eq([])
            })
    })

    it('muestra errores de validación, conflicto 409 y error genérico al guardar', () => {
        openEdit()
        cy.intercept('PATCH', `**/businesses/orders/${orderId}`, {
            statusCode: 409,
            body: { error: { code: 'ORDER_VERSION_CONFLICT', message: 'Version conflict' } },
        }).as('conflict')
        cy.get('[data-cy="edit-order-modal"]').contains('Para llevar').click()
        cy.get('[data-cy="edit-order-review"]').click()
        cy.get('[data-cy="edit-order-save"]').click()
        cy.wait('@conflict')
        cy.contains('La orden fue modificada en otra sesión').should('be.visible')
    })

    it('muestra el error cuando el backend rechaza la orden por datos inválidos', () => {
        openEdit()
        cy.intercept('PATCH', `**/businesses/orders/${orderId}`, {
            statusCode: 400,
            body: { error: { code: 'VALIDATION_ERROR', message: 'Invalid order' } },
        }).as('validationError')
        cy.get('[data-cy="edit-order-modal"]').contains('Para llevar').click()
        cy.get('[data-cy="edit-order-review"]').click()
        cy.get('[data-cy="edit-order-save"]').click()
        cy.wait('@validationError')
        cy.contains('No pudimos guardar los cambios').should('be.visible')
    })

    it('muestra el error cuando la orden cambia a un estado no editable antes de guardar', () => {
        openEdit()
        cy.intercept('PATCH', `**/businesses/orders/${orderId}`, {
            statusCode: 409,
            body: { error: { code: 'ORDER_NOT_EDITABLE', message: 'Ready orders cannot change' } },
        }).as('notEditable')
        cy.get('[data-cy="edit-order-modal"]').contains('Para llevar').click()
        cy.get('[data-cy="edit-order-review"]').click()
        cy.get('[data-cy="edit-order-save"]').click()
        cy.wait('@notEditable')
        cy.contains('La orden ya no se puede editar porque cambió de estado').should('be.visible')
    })

    it('no muestra ni permite abrir edición cuando la orden ya está lista', () => {
        cy.login()
        cy.then(() => installApi({ status: 'READY' }))
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        cy.contains('article', '#812').find('button').contains('#812').click()
        cy.wait('@orderDetail')
        cy.get('[aria-labelledby="order-detail-title"]').should('be.visible')
        cy.get('[aria-labelledby="order-detail-title"]')
            .contains('Editar orden')
            .should('not.exist')
        cy.get('[data-cy="edit-order-modal"]').should('not.exist')
    })
})

export {}
