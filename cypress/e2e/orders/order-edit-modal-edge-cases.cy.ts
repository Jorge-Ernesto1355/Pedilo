import { assertDialogFitsViewport, assertPageFitsViewport } from '../../support/responsive'

/**
 * Casos borde del modal de edición de órdenes (EditOrderModal).
 *
 * Complementa `order-edit-modal-granular.cy.ts` (que se conserva tal cual). Toda la
 * API se simula con cy.intercept, así que los tests no escriben datos reales; solo
 * se usa cy.login() para tener sesión en el dashboard.
 */

type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'
type Json = Record<string, unknown>
type Reply = { statusCode?: number; body?: unknown; delay?: number; forceNetworkError?: boolean }

const orderId = 'order-edit-edge-cypress'
const burgerId = 'product-burger-edge'
const friesId = 'product-fries-edge'
const comboId = 'combo-tray-edge'
const customerId = 'customer-edge-initial'

const cheeseId = 'option-cheese-edge'
const baconId = 'option-bacon-edge'

function makeOptionGroups(productId: string) {
    return [
        {
            id: 'group-extras-edge',
            productId,
            name: 'Extras',
            isRequired: false,
            minSelections: 0,
            maxSelections: 3,
            isActive: true,
            sortOrder: 0,
            options: [
                {
                    id: cheeseId,
                    optionGroupId: 'group-extras-edge',
                    name: 'Queso',
                    price: 15,
                    minSelections: 0,
                    maxSelections: 2,
                    isAvailable: true,
                    sortOrder: 0,
                },
                {
                    id: baconId,
                    optionGroupId: 'group-extras-edge',
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
}

function makeCombo(options: { wingsAvailable?: boolean } = {}) {
    return {
        id: comboId,
        name: 'Charola Edge',
        optionGroups: [
            {
                id: 'combo-group-side-edge',
                comboProductId: comboId,
                name: 'Acompañamiento',
                minSelections: 1,
                maxSelections: 1,
                sortOrder: 0,
                products: [
                    {
                        id: 'choice-fries-edge',
                        productId: 'fries-edge',
                        sortOrder: 0,
                        product: { id: 'fries-edge', name: 'Papas', isAvailable: true },
                    },
                    {
                        id: 'choice-wings-edge',
                        productId: 'wings-edge',
                        sortOrder: 1,
                        product: {
                            id: 'wings-edge',
                            name: 'Alitas',
                            isAvailable: options.wingsAvailable ?? true,
                        },
                    },
                ],
            },
        ],
    }
}

function makeItem(overrides: Json = {}) {
    return {
        id: 'item-burger-edge',
        productId: burgerId,
        productName: 'Hamburguesa Edge',
        quantity: 1,
        unitPrice: 100,
        unitPriceFinal: 100,
        subtotal: 100,
        options: [],
        ...overrides,
    }
}

function makeOrder(overrides: Json = {}) {
    return {
        id: orderId,
        orderNumber: 812,
        version: 4,
        status: 'PENDING' as OrderStatus,
        customerId,
        customerName: 'Cliente Inicial',
        customerPhone: '6691234567',
        fulfillmentType: 'DINE_IN',
        paymentMethod: 'CASH',
        subtotal: 100,
        discountAmount: 0,
        total: 100,
        items: [makeItem()],
        statusHistory: [],
        createdAt: '2026-11-10T12:00:00.000Z',
        updatedAt: '2026-11-10T12:00:00.000Z',
        ...overrides,
    }
}

function makeMenus(
    products: Array<{ id: string; name: string; price: number | string; type?: string }>,
) {
    return [
        {
            id: 'menu-edge',
            name: 'Menú Edge',
            categories: [{ id: 'category-edge', name: 'Todo', products }],
        },
    ]
}

type ApiOptions = {
    order?: Json
    customers?: Array<{ id: string; name: string; phone: string }>
    menus?: unknown[]
    optionGroups?: (productId: string) => unknown[]
    optionGroupsStatus?: number
    combo?: ReturnType<typeof makeCombo>
    comboFailures?: number
    comboDelay?: number
    /** Respuestas sucesivas del PATCH; la última se repite. Por defecto: 200 con versión + 1. */
    updateReplies?: Reply[]
    updatedOrder?: Json
}

/**
 * Registra todas las rutas que usa la pantalla de Pedidos y el modal. Mantiene la
 * "orden actual" en memoria para que el detalle y la lista reflejen un PATCH exitoso.
 */
function installApi(options: ApiOptions = {}) {
    let current: Json = makeOrder(options.order)
    let comboAttempts = 0
    let updateAttempts = 0

    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: { currency: 'MXN', timezone: 'America/Mazatlan' },
    })
    cy.intercept('GET', '**/businesses/payment-card', { statusCode: 404, body: {} })

    cy.intercept('GET', `**/businesses/orders/${orderId}`, (request) => {
        request.reply({ delay: 50, statusCode: 200, body: { order: current } })
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

    cy.intercept('GET', '**/businesses/products/*/option-groups', (request) => {
        if (options.optionGroupsStatus) {
            request.reply({ statusCode: options.optionGroupsStatus, body: {} })
            return
        }
        const productId = request.url.split('/products/')[1].split('/')[0]
        request.reply({
            statusCode: 200,
            body: { optionGroups: (options.optionGroups ?? makeOptionGroups)(productId) },
        })
    }).as('optionGroups')
    cy.intercept('GET', '**/businesses/products/*/global-option-groups', {
        statusCode: 200,
        body: { groups: [] },
    }).as('globalOptionGroups')
    cy.intercept('GET', '**/businesses/products/*/combo-option-groups', (request) => {
        if (!request.url.includes(`/products/${comboId}/`)) {
            request.reply({ statusCode: 404, body: { error: { code: 'NOT_FOUND' } } })
            return
        }
        comboAttempts += 1
        if (comboAttempts <= (options.comboFailures ?? 0)) {
            request.reply({
                delay: options.comboDelay ?? 0,
                statusCode: 500,
                body: { error: { code: 'INTERNAL_ERROR' } },
            })
            return
        }
        request.reply({
            delay: options.comboDelay ?? 0,
            statusCode: 200,
            body: { combo: options.combo ?? makeCombo() },
        })
    }).as('comboDetails')

    cy.intercept('GET', '**/businesses/*/customers*', (request) => {
        const search = (new URL(request.url).searchParams.get('search') ?? '').toLowerCase()
        const matches = (options.customers ?? []).filter(
            (customer) =>
                customer.name.toLowerCase().includes(search) || customer.phone.includes(search),
        )
        request.reply({
            statusCode: 200,
            body: { customers: matches, page: 1, limit: 8, total: matches.length },
        })
    }).as('customers')

    cy.intercept('GET', '**/businesses/mine/menus', {
        statusCode: 200,
        body: { menus: options.menus ?? [] },
    }).as('menus')

    cy.intercept('PATCH', `**/businesses/orders/${orderId}`, (request) => {
        const replies = options.updateReplies
        const reply = replies?.[Math.min(updateAttempts, replies.length - 1)]
        updateAttempts += 1
        if (reply) {
            request.reply(reply)
            return
        }
        current = {
            ...current,
            version: Number(current.version ?? 1) + 1,
            ...options.updatedOrder,
        }
        request.reply({ statusCode: 200, body: { order: current } })
    }).as('updateOrder')
}

function openEdit(options: ApiOptions = {}) {
    const orderNumber = Number((options.order?.orderNumber as number | undefined) ?? 812)
    const label = `#${String(orderNumber).padStart(3, '0')}`
    cy.login()
    cy.then(() => installApi(options))
    cy.visit('/dashboard/orders')
    cy.wait('@ordersList')
    cy.contains('article', label).find('button').contains(label).click()
    cy.wait('@orderDetail')
    cy.get('[aria-labelledby="order-detail-title"]').contains('Editar orden').click()
    cy.get('[data-cy="edit-order-modal"]').should('be.visible')
}

const modal = () => cy.get('[data-cy="edit-order-modal"]')
const reviewButton = () => cy.get('[data-cy="edit-order-review"]')
const saveButton = () => cy.get('[data-cy="edit-order-save"]')
const items = () => cy.get('[data-cy="edit-order-item"]')
const requestCount = (alias: string) => cy.get(`@${alias}.all`)

function goToReview() {
    reviewButton().should('not.be.disabled').click()
    cy.contains('Confirma los cambios').should('be.visible')
}

const MOBILE_NAV = 'nav[aria-label="Navegación móvil"]'

/** El elemento termina por encima de la navegación inferior móvil. */
function assertClearOfMobileNav(selector: string) {
    cy.get(MOBILE_NAV).then(($nav) => {
        const navTop = $nav[0].getBoundingClientRect().top
        cy.get(selector).should(($element) => {
            expect($element[0].getBoundingClientRect().bottom, `${selector} bottom`).to.be.at.most(
                navTop,
            )
        })
    })
}

/** Al hacer clic en el centro del control, lo recibe él y no algo encima (p. ej. la barra). */
function assertNotCovered($control: JQuery<HTMLElement>, label: string) {
    const rect = $control[0].getBoundingClientRect()
    const hit = $control[0].ownerDocument.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
    )
    expect($control[0].contains(hit), `${label} es el elemento superior`).to.eq(true)
}

describe('Edición de órdenes · casos borde', () => {
    before(() => {
        Cypress.config('retries', 0)
        Cypress.config('pageLoadTimeout', 60_000)
    })

    describe('estado inicial y detección de cambios', () => {
        it('muestra el número de pedido con ceros a la izquierda y un diálogo accesible', () => {
            openEdit({ order: { orderNumber: 7 } })
            modal()
                .should('have.attr', 'role', 'dialog')
                .and('have.attr', 'aria-modal', 'true')
                .and('have.attr', 'aria-labelledby', 'edit-order-title')
            cy.get('#edit-order-title').should('have.text', 'Pedido #007')
        })

        it('no permite revisar mientras no haya cambios y vuelve a bloquearse si se revierten', () => {
            openEdit()
            reviewButton().should('be.disabled')

            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            reviewButton().should('not.be.disabled')
            cy.get('[aria-label="Disminuir cantidad de Hamburguesa Edge"]').click()
            reviewButton().should('be.disabled')

            modal().contains('Para llevar').click()
            reviewButton().should('not.be.disabled')
            modal().contains('Comer aquí').click()
            reviewButton().should('be.disabled')

            modal().contains('Transferencia').click()
            reviewButton().should('not.be.disabled')
            modal().contains('Efectivo').click()
            reviewButton().should('be.disabled')
        })

        it('una orden sin cliente (customerId null) no aparece como modificada al abrirla', () => {
            openEdit({ order: { customerId: null, customerName: null, customerPhone: null } })
            cy.contains('Quitar').should('not.exist')
            reviewButton().should('be.disabled')
        })

        it('una orden sin cliente conserva customerId null al guardar otro cambio', () => {
            openEdit({ order: { customerId: null, customerName: null, customerPhone: null } })
            modal().contains('Para llevar').click()
            goToReview()
            cy.contains('Sin cliente asignado').should('be.visible')
            saveButton().click()
            cy.wait('@updateOrder')
                .its('request.body')
                .should((body) => {
                    expect(body.customerId).to.eq(null)
                    expect(body.fulfillmentType).to.eq('PICKUP')
                })
        })

        it('usa efectivo por defecto cuando la orden no trae método de pago', () => {
            openEdit({ order: { paymentMethod: undefined } })
            modal().contains('button', 'Efectivo').should('have.attr', 'aria-pressed', 'true')
            modal().contains('button', 'Transferencia').should('have.attr', 'aria-pressed', 'false')
            modal().contains('Para llevar').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.paymentMethod').should('eq', 'CASH')
        })

        it('envía expectedVersion 1 cuando la orden no trae versión', () => {
            openEdit({ order: { version: undefined } })
            modal().contains('Para llevar').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.expectedVersion').should('eq', 1)
        })

        it('muestra el nombre alterno cuando la línea no trae productName', () => {
            openEdit({
                order: {
                    items: [makeItem({ productName: undefined, name: 'Nombre alterno' })],
                },
            })
            items().first().should('contain', 'Nombre alterno')
        })
    })

    describe('cantidades y líneas de producto', () => {
        it('no baja la cantidad de 1 con el botón de disminuir', () => {
            openEdit()
            cy.get('[aria-label="Disminuir cantidad de Hamburguesa Edge"]').click().click()
            items().first().find('span.text-center').should('have.text', '1')
            reviewButton().should('be.disabled')
        })

        it('no deja guardar una orden sin productos', () => {
            openEdit()
            cy.get('[aria-label="Eliminar Hamburguesa Edge"]').click()
            items().should('have.length', 0)
            reviewButton().should('be.disabled')
        })

        it('recalcula el subtotal en vivo y los totales de la confirmación respetando el descuento', () => {
            openEdit({
                order: { subtotal: 100, discountAmount: 20, total: 80 },
            })
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            items().first().should('contain', '$200.00')
            // Se acota al modal: el detalle de la orden, detrás, también tiene un "Productos".
            modal().contains('h3', 'Productos').parent().should('contain', '$200.00')
            goToReview()
            cy.contains('p', 'Total actual').next().should('have.text', '$80.00')
            cy.contains('p', 'Total después').next().should('have.text', '$180.00')
            cy.contains('1 producto(s) en la orden').should('be.visible')
        })

        it('nunca muestra un total negativo si el descuento supera al subtotal', () => {
            openEdit({ order: { subtotal: 100, discountAmount: 150, total: 0 } })
            modal().contains('Para llevar').click()
            goToReview()
            cy.contains('p', 'Total después').next().should('have.text', '$0.00')
        })

        it('conserva el id de las líneas existentes, no manda extras sin tocar y la línea nueva va sin id', () => {
            openEdit({
                menus: makeMenus([{ id: friesId, name: 'Papas fritas', price: '89.5' }]),
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').should('contain', '$89.50').click()
            items().should('have.length', 2)
            items().last().should('contain', '$89.50')
            goToReview()
            cy.contains('2 producto(s) en la orden').should('be.visible')
            saveButton().click()
            cy.wait('@updateOrder')
                .its('request.body')
                .should((body) => {
                    expect(body.items).to.have.length(2)
                    expect(body.items[0]).to.have.property('id', 'item-burger-edge')
                    expect(body.items[0]).not.to.have.property('optionIds')
                    expect(body.items[0]).not.to.have.property('comboChoiceIds')
                    expect(body.items[1]).not.to.have.property('id')
                    expect(body.items[1]).to.include({ productId: friesId, quantity: 1 })
                    expect(body.items[1].optionIds).to.deep.eq([])
                    expect(body.items[1].comboChoiceIds).to.deep.eq([])
                })
        })

        it('filtra el catálogo sin distinguir mayúsculas ni espacios laterales y restaura la lista al limpiar', () => {
            openEdit({
                menus: makeMenus([
                    { id: burgerId, name: 'Hamburguesa Edge', price: 100 },
                    { id: friesId, name: 'Papas Fritas', price: 40 },
                    { id: 'product-soda-edge', name: 'Refresco', price: 25 },
                ]),
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').should('have.length', 3)
            cy.get('input[aria-label="Buscar producto para agregar"]').type('  PAPAS ')
            cy.get('[data-cy="edit-order-product"]')
                .should('have.length', 1)
                .and('contain', 'Papas')
            cy.get('input[aria-label="Buscar producto para agregar"]').clear()
            cy.get('[data-cy="edit-order-product"]').should('have.length', 3)
        })

        it('cierra y reabre el selector de productos sin volver a pedir el catálogo', () => {
            openEdit({ menus: makeMenus([{ id: friesId, name: 'Papas', price: 40 }]) })
            const toggle = () => cy.get('[data-cy="edit-order-product-picker-toggle"]')
            toggle().should('contain', 'Seleccionar').click()
            cy.wait('@menus')
            toggle().should('contain', 'Cerrar').click()
            cy.get('[data-cy="edit-order-product"]').should('not.exist')
            toggle().click()
            cy.get('[data-cy="edit-order-product"]').should('have.length', 1)
            requestCount('menus').should('have.length', 1)
        })

        it('maneja órdenes grandes: 25 líneas y una sola consulta de variantes por producto distinto', () => {
            const products = [burgerId, friesId, 'product-soda-edge']
            const manyItems = Array.from({ length: 25 }, (_, index) =>
                makeItem({
                    id: `item-${index}`,
                    productId: products[index % products.length],
                    productName: `Producto ${index % products.length}`,
                }),
            )
            openEdit({ order: { items: manyItems, subtotal: 2500, total: 2500 } })
            items().should('have.length', 25)
            cy.get('@optionGroups.all').should('have.length', 3)
            cy.get('@globalOptionGroups.all').should('have.length', 3)
            items().last().scrollIntoView().should('be.visible')
        })
    })

    describe('variantes y extras', () => {
        it('respeta el máximo por opción, calcula el precio y envía las cantidades repetidas', () => {
            openEdit()
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').click()

            cy.get('button[aria-label="Quitar Queso"]').should('be.disabled')
            cy.get('button[aria-label="Agregar Queso"]').click().click()
            cy.get('button[aria-label="Agregar Queso"]').should('be.disabled')
            cy.get('button[aria-label="Agregar Tocino"]').click()
            cy.get('button[aria-label="Agregar Tocino"]').should('be.disabled')
            // 100 base + 2 × 15 + 20 = 150
            items().first().should('contain', '$150.00')

            cy.get('button[aria-label="Quitar Queso"]').click()
            items().first().should('contain', '$135.00')

            goToReview()
            saveButton().click()
            // El orden de los ids no es parte del contrato (al cambiar una opción el modal la
            // mueve al final), lo que importa es la cantidad de cada una: 1 queso + 1 tocino.
            cy.wait('@updateOrder')
                .its('request.body.items.0.optionIds')
                .should((ids: string[]) => {
                    expect([...ids].sort()).to.deep.eq([baconId, cheeseId].sort())
                })
        })

        it('no ofrece grupos inactivos ni opciones no disponibles', () => {
            openEdit({
                optionGroups: (productId) => {
                    const [group] = makeOptionGroups(productId)
                    return [
                        {
                            ...group,
                            options: [
                                group.options[0],
                                { ...group.options[1], isAvailable: false },
                            ],
                        },
                        {
                            ...group,
                            id: 'group-inactive-edge',
                            name: 'Salsas inactivas',
                            isActive: false,
                        },
                    ]
                },
            })
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').click()
            cy.contains('legend', 'Extras').should('be.visible')
            cy.get('button[aria-label="Agregar Queso"]').should('exist')
            cy.get('button[aria-label="Agregar Tocino"]').should('not.exist')
            cy.contains('Salsas inactivas').should('not.exist')
        })

        it('preselecciona los extras que ya tenía la línea, recalcula el precio base y permite quitarlos', () => {
            openEdit({
                order: {
                    subtotal: 115,
                    total: 115,
                    items: [
                        makeItem({
                            unitPrice: 115,
                            unitPriceFinal: 115,
                            subtotal: 115,
                            options: [{ name: 'Queso', groupName: 'Extras', price: 15 }],
                        }),
                    ],
                },
            })
            cy.wait('@optionGroups')
            items().first().should('contain', 'Extras actuales: Queso').and('contain', '$115.00')
            cy.contains('Editar variantes y extras').click()
            cy.get('button[aria-label="Quitar Queso"]').should('not.be.disabled')
            items().first().should('contain', '$115.00')
            // Al entrar al editor la línea pasa a enviar sus optionIds completos (reemplaza las
            // opciones guardadas), por eso desde ese momento cuenta como cambio.
            reviewButton().should('not.be.disabled')

            cy.get('button[aria-label="Quitar Queso"]').click()
            items().first().should('contain', '$100.00')
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.items.0.optionIds').should('deep.eq', [])
        })

        it('cancelar la edición de extras restaura el precio original y vuelve a bloquear la revisión', () => {
            openEdit()
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').click()
            cy.get('button[aria-label="Agregar Tocino"]').click()
            items().first().should('contain', '$120.00')
            reviewButton().should('not.be.disabled')
            cy.get('button[title="Cancelar edición"]').click()
            items().first().should('contain', '$100.00')
            cy.contains('Editar variantes y extras').should('be.visible')
            reviewButton().should('be.disabled')
        })

        it('una línea recién agregada muestra el editor de extras sin pasar por el botón de edición', () => {
            openEdit({ menus: makeMenus([{ id: friesId, name: 'Papas', price: 40 }]) })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').click()
            items()
                .last()
                .within(() => {
                    cy.contains('Variantes y extras').should('be.visible')
                    cy.get('button[aria-label="Agregar Tocino"]').click()
                })
            items().last().should('contain', '$60.00')
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder')
                .its('request.body.items.1.optionIds')
                .should('deep.eq', [baconId])
        })

        it('si falla la carga de variantes no muestra el editor pero deja guardar otros cambios', () => {
            openEdit({ optionGroupsStatus: 500 })
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').should('not.exist')
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.items.0.quantity').should('eq', 2)
        })

        // TODO: pendiente de producto. El modal sólo limita por opción (option.maxSelections);
        // no suma las selecciones del grupo contra group.maxSelections. Quitar .skip cuando
        // se implemente.
        it.skip('no permite superar el máximo total del grupo (maxSelections) sumando opciones distintas', () => {
            // El grupo Extras permite 3 como máximo: 2 de queso + 1 de tocino ya lo agota.
            openEdit({
                optionGroups: (productId) => {
                    const [group] = makeOptionGroups(productId)
                    return [
                        {
                            ...group,
                            maxSelections: 2,
                            options: [
                                { ...group.options[0], maxSelections: 2 },
                                { ...group.options[1], maxSelections: 2 },
                            ],
                        },
                    ]
                },
            })
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').click()
            cy.get('button[aria-label="Agregar Queso"]').click().click()
            // Con 2 de 2 en el grupo, ya no debería poder agregar tocino.
            cy.get('button[aria-label="Agregar Tocino"]').should('be.disabled')
        })

        // TODO: pendiente de producto. save() sólo valida los grupos de combo (minSelections);
        // no valida grupos de opciones con isRequired/minSelections. Quitar .skip cuando se
        // implemente.
        it.skip('no permite guardar si se vacía un grupo de opciones obligatorio', () => {
            openEdit({
                order: {
                    items: [
                        makeItem({
                            unitPrice: 115,
                            unitPriceFinal: 115,
                            subtotal: 115,
                            options: [{ name: 'Queso', groupName: 'Extras', price: 15 }],
                        }),
                    ],
                },
                optionGroups: (productId) => [
                    { ...makeOptionGroups(productId)[0], isRequired: true, minSelections: 1 },
                ],
            })
            cy.wait('@optionGroups')
            cy.contains('Editar variantes y extras').click()
            cy.get('button[aria-label="Quitar Queso"]').click()
            goToReview()
            saveButton().click()
            modal().find('[role="alert"]').should('be.visible')
            requestCount('updateOrder').should('have.length', 0)
        })
    })

    describe('combos', () => {
        const comboLine = (options: Json[]) =>
            makeItem({
                id: 'item-tray',
                productId: comboId,
                productName: 'Charola Edge',
                unitPrice: 250,
                unitPriceFinal: 250,
                subtotal: 250,
                options,
            })

        it('permite guardar un cambio ajeno al combo sin tocar las variantes del combo', () => {
            openEdit({
                order: {
                    items: [comboLine([{ name: 'Papas', groupName: 'Acompañamiento', price: 0 }])],
                    subtotal: 250,
                    total: 250,
                },
            })
            cy.wait('@comboDetails')
            modal().contains('Para llevar').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.fulfillmentType').should('eq', 'PICKUP')
            // Se acota al modal: la pantalla de atrás puede tener sus propias alertas.
            modal().should('not.exist')
        })

        it('bloquea el guardado si la elección original del combo ya no existe, y permite elegir otra', () => {
            openEdit({
                order: {
                    items: [
                        comboLine([{ name: 'Ensalada', groupName: 'Acompañamiento', price: 0 }]),
                    ],
                    subtotal: 250,
                    total: 250,
                },
            })
            cy.wait('@comboDetails')
            cy.contains('Editar variantes y extras').click()
            cy.get('input[name="edit-combo-0-combo-group-side-edge"]').should('not.be.checked')
            goToReview()
            saveButton().click()
            cy.contains(
                'Selecciona las opciones del combo “Charola Edge” antes de guardar.',
            ).should('be.visible')
            requestCount('updateOrder').should('have.length', 0)

            cy.contains('Volver a editar').click()
            cy.contains('label', 'Alitas').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder')
                .its('request.body.items.0.comboChoiceIds')
                .should('deep.eq', ['choice-wings-edge'])
        })

        it('agregar un combo exige elegir acompañamiento, se puede cancelar y envía la elección', () => {
            openEdit({
                menus: makeMenus([
                    { id: comboId, name: 'Charola Edge', price: 250, type: 'COMBO' },
                ]),
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')

            cy.get('[data-cy="edit-order-product"]').click()
            cy.get('[aria-labelledby="combo-selection-title"]').should('be.visible')
            cy.contains('button', 'Agregar combo').should('be.disabled')
            cy.get('[aria-label="Cancelar selección del combo"]').click()
            cy.get('[aria-labelledby="combo-selection-title"]').should('not.exist')
            items().should('have.length', 1)

            cy.get('[data-cy="edit-order-product"]').click()
            cy.contains('label', 'Alitas').click()
            cy.contains('button', 'Agregar combo').should('not.be.disabled').click()
            cy.get('[aria-labelledby="combo-selection-title"]').should('not.exist')
            items().should('have.length', 2)
            items().last().should('contain', 'Acompañamiento: Alitas').and('contain', '$250.00')

            goToReview()
            saveButton().click()
            cy.wait('@updateOrder')
                .its('request.body.items.1')
                .should((line) => {
                    expect(line.productId).to.eq(comboId)
                    expect(line).not.to.have.property('id')
                    expect(line.comboChoiceIds).to.deep.eq(['choice-wings-edge'])
                })
        })

        it('muestra skeleton mientras carga el combo y error con reintento si falla', () => {
            openEdit({
                menus: makeMenus([
                    { id: comboId, name: 'Charola Edge', price: 250, type: 'COMBO' },
                ]),
                comboFailures: 1,
                comboDelay: 400,
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').click()
            cy.get('[aria-label="Cargando opciones del combo"]').should('be.visible')
            cy.contains('button', 'Agregar combo').should('be.disabled')
            cy.contains('No pudimos cargar los grupos de este combo').should('be.visible')
            cy.contains('button', 'Agregar combo').should('be.disabled')
            cy.get('[aria-labelledby="combo-selection-title"]')
                .contains('button', 'Intentar de nuevo')
                .click()
            cy.contains('label', 'Papas').should('be.visible')
        })

        it('no ofrece como elección un producto del combo que no está disponible', () => {
            openEdit({
                combo: makeCombo({ wingsAvailable: false }),
                menus: makeMenus([
                    { id: comboId, name: 'Charola Edge', price: 250, type: 'COMBO' },
                ]),
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').click()
            cy.contains('label', 'Papas').should('be.visible')
            cy.contains('label', 'Alitas').should('not.exist')
        })
    })

    describe('clientes', () => {
        const customers = [
            { id: 'customer-maria', name: 'María López', phone: '6691110000' },
            { id: 'customer-jose', name: 'José & Co', phone: '' },
        ]
        const searchInput = () => cy.get('input[aria-label="Buscar cliente para la orden"]')

        it('quita el cliente de la orden y envía customerId null', () => {
            openEdit()
            cy.contains('strong', 'Cliente Inicial').should('be.visible')
            cy.contains('button', 'Quitar').click()
            cy.contains('strong', 'Cliente Inicial').should('not.exist')
            reviewButton().should('not.be.disabled')
            goToReview()
            cy.contains('Sin cliente asignado').should('be.visible')
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.customerId').should('eq', null)
        })

        it('cambia a otro cliente, limpia la búsqueda y muestra "Sin teléfono" si no tiene', () => {
            openEdit({ customers })
            searchInput().type('Jos')
            cy.wait('@customers')
            modal().contains('button', 'José & Co').click()
            searchInput().should('have.value', '')
            cy.contains('strong', 'José & Co').parent().should('contain', 'Sin teléfono')
            cy.contains('strong', 'Cliente Inicial').should('not.exist')
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder').its('request.body.customerId').should('eq', 'customer-jose')
        })

        it('no consulta clientes con menos de 2 caracteres ni con espacios de relleno', () => {
            openEdit({ customers })
            searchInput().type('M')
            cy.wait(600) // más que el debounce de 350 ms
            requestCount('customers').should('have.length', 0)
            searchInput().clear().type('  M  ')
            cy.wait(600)
            requestCount('customers').should('have.length', 0)
            cy.get('[aria-label="Buscando clientes"]').should('not.exist')
        })

        it('aplica debounce: escribir rápido genera una sola consulta con el texto final', () => {
            openEdit({ customers })
            searchInput().type('María', { delay: 40 })
            cy.wait('@customers').its('request.url').should('include', 'search=Mar')
            requestCount('customers').should('have.length', 1)
            cy.wait(600)
            requestCount('customers').should('have.length', 1)
        })

        it('codifica correctamente acentos y símbolos reservados en la búsqueda', () => {
            openEdit({ customers })
            searchInput().type('José & Co')
            cy.wait('@customers')
                .its('request.url')
                .should((url) => {
                    expect(new URL(url).searchParams.get('search')).to.eq('José & Co')
                })
            modal().contains('button', 'José & Co').should('be.visible')
        })

        it('muestra el estado vacío cuando no hay coincidencias', () => {
            openEdit({ customers })
            searchInput().type('zzzz')
            cy.wait('@customers')
            cy.contains('No hay ningún cliente que coincida con la búsqueda.').should('be.visible')
        })
    })

    describe('guardado y errores', () => {
        function changeAndReview() {
            modal().contains('Para llevar').click()
            goToReview()
        }

        it('muestra "Guardando…", bloquea el botón y no duplica el PATCH con un segundo clic', () => {
            openEdit({
                updateReplies: [
                    { statusCode: 200, delay: 800, body: { order: makeOrder({ version: 5 }) } },
                ],
            })
            changeAndReview()
            saveButton().click()
            saveButton().should('be.disabled').and('contain', 'Guardando…')
            // Un segundo clic ya con el botón bloqueado (dblclick sintético dispara los dos
            // clics sin dar tiempo a React de re-renderizar, algo que una persona no hace).
            saveButton().click({ force: true })
            cy.wait('@updateOrder')
            requestCount('updateOrder').should('have.length', 1)
        })

        it('al guardar con éxito cierra el modal, avisa y refleja la orden actualizada', () => {
            openEdit({
                updatedOrder: {
                    fulfillmentType: 'PICKUP',
                    items: [makeItem({ quantity: 2, subtotal: 200 })],
                    subtotal: 200,
                    total: 200,
                },
            })
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder')
            modal().should('not.exist')
            cy.contains('Orden actualizada').should('be.visible')
            cy.get('[aria-labelledby="order-detail-title"]')
                .should('be.visible')
                .and('contain', '$200.00')
            cy.get('@ordersList.all').should('have.length.greaterThan', 1)
        })

        it('ante un error 500 mantiene el modal y las ediciones, y un reintento limpia el error', () => {
            openEdit({
                updateReplies: [
                    { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } },
                    { statusCode: 200, body: { order: makeOrder({ version: 5 }) } },
                ],
            })
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            goToReview()
            saveButton().click()
            cy.wait('@updateOrder')
            cy.contains('No pudimos guardar los cambios').should('be.visible')
            saveButton().should('not.be.disabled').and('contain', 'Confirmar y guardar')
            modal().should('be.visible')

            saveButton().click()
            cy.wait('@updateOrder').its('request.body.items.0.quantity').should('eq', 2)
            modal().should('not.exist')
        })

        it('ante una caída de red muestra el error genérico sin perder los cambios', () => {
            openEdit({ updateReplies: [{ forceNetworkError: true }] })
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            goToReview()
            saveButton().click()
            cy.contains('No pudimos guardar los cambios').should('be.visible')
            saveButton().should('not.be.disabled')
            cy.contains('Volver a editar').click()
            items().first().should('contain', '$200.00')
        })

        it('si la orden ya no existe (404) informa el error y no cierra el modal', () => {
            openEdit({
                updateReplies: [{ statusCode: 404, body: { error: { code: 'ORDER_NOT_FOUND' } } }],
            })
            changeAndReview()
            saveButton().click()
            cy.wait('@updateOrder')
            cy.contains('No pudimos guardar los cambios').should('be.visible')
            modal().should('be.visible')
        })

        it('tras un conflicto 409 conserva lo que el usuario había editado', () => {
            openEdit({
                updateReplies: [
                    {
                        statusCode: 409,
                        body: { error: { code: 'ORDER_VERSION_CONFLICT', message: 'conflict' } },
                    },
                ],
            })
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click().click()
            modal().contains('Transferencia').click()
            goToReview()
            saveButton().click()
            cy.contains('La orden fue modificada en otra sesión').should('be.visible')
            cy.contains('Volver a editar').click()
            items().first().should('contain', '$300.00')
            modal().contains('button', 'Transferencia').should('have.attr', 'aria-pressed', 'true')
        })

        it('"Volver a editar" regresa a la edición con el estado intacto', () => {
            openEdit()
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            goToReview()
            cy.contains('Volver a editar').click()
            cy.contains('Confirma los cambios').should('not.exist')
            items().first().should('contain', '$200.00')
            reviewButton().should('not.be.disabled')
            requestCount('updateOrder').should('have.length', 0)
        })

        it('cerrar con la X o con Cancelar descarta los cambios y no envía nada', () => {
            openEdit()
            cy.get('[aria-label="Aumentar cantidad de Hamburguesa Edge"]').click()
            cy.get('[aria-label="Cerrar edición"]').click()
            modal().should('not.exist')

            cy.get('[aria-labelledby="order-detail-title"]').contains('Editar orden').click()
            items().first().should('contain', '$100.00')
            modal().contains('button', 'Cancelar').click()
            modal().should('not.exist')
            requestCount('updateOrder').should('have.length', 0)
        })
    })

    describe('estado de la orden', () => {
        it('permite editar órdenes en preparación', () => {
            openEdit({ order: { status: 'PREPARING' } })
            modal().should('be.visible')
        })

        it('no ofrece editar órdenes canceladas', () => {
            cy.login()
            cy.then(() => installApi({ order: { status: 'CANCELLED' } }))
            cy.visit('/dashboard/orders')
            cy.wait('@ordersList')
            cy.contains('article', '#812').find('button').contains('#812').click()
            cy.wait('@orderDetail')
            cy.get('[aria-labelledby="order-detail-title"]').should('be.visible')
            cy.contains('Editar orden').should('not.exist')
        })
    })

    describe('móvil', () => {
        beforeEach(() => {
            cy.viewport(375, 667)
        })

        it('el modal cabe en 375px, sin desbordes horizontales, y permite completar el flujo', () => {
            const longName = 'Hamburguesa doble con queso, tocino extra y salsa especial de la casa'
            openEdit({
                order: {
                    items: [
                        makeItem({ productName: longName }),
                        makeItem({ id: 'item-2', productName: 'Papas', productId: friesId }),
                        makeItem({ id: 'item-3', productName: 'Refresco', productId: 'soda' }),
                    ],
                    subtotal: 300,
                    total: 300,
                },
            })
            assertDialogFitsViewport('[data-cy="edit-order-modal"]')
            assertPageFitsViewport()
            modal().should(($dialog) => {
                expect($dialog[0].scrollWidth).to.be.at.most($dialog[0].clientWidth)
            })

            modal().contains('Para llevar').click()
            reviewButton().scrollIntoView().should('be.visible').click()
            cy.contains('Confirma los cambios').should('be.visible')
            saveButton().scrollIntoView().should('be.visible')
            modal().should(($dialog) => {
                expect($dialog[0].scrollWidth).to.be.at.most($dialog[0].clientWidth)
            })
            saveButton().click()
            cy.wait('@updateOrder')
            modal().should('not.exist')
        })

        it('la navegación inferior no tapa el modal ni sus botones de acción', () => {
            // Muchas líneas para que el modal tenga que hacer scroll interno.
            const manyItems = Array.from({ length: 8 }, (_, index) =>
                makeItem({ id: `item-${index}`, productName: `Producto ${index}` }),
            )
            openEdit({ order: { items: manyItems, subtotal: 800, total: 800 } })
            modal().contains('Para llevar').click()

            // Ningún borde del modal debe quedar por debajo del inicio de la barra.
            assertClearOfMobileNav('[data-cy="edit-order-modal"]')

            // Al llegar al botón del pie, lo que recibe el clic es el botón, no la barra.
            reviewButton().scrollIntoView().should('be.visible')
            reviewButton().then(($button) => assertNotCovered($button, 'revisar'))
            reviewButton().click()
            cy.contains('Confirma los cambios').should('be.visible')
            saveButton()
                .scrollIntoView()
                .then(($button) => assertNotCovered($button, 'guardar'))
        })

        it('el cuadro de selección de combo también cabe en pantalla pequeña', () => {
            openEdit({
                menus: makeMenus([
                    { id: comboId, name: 'Charola Edge', price: 250, type: 'COMBO' },
                ]),
            })
            cy.get('[data-cy="edit-order-product-picker-toggle"]').click()
            cy.wait('@menus')
            cy.get('[data-cy="edit-order-product"]').click()
            assertDialogFitsViewport('[aria-labelledby="combo-selection-title"]')
            assertPageFitsViewport()
            // Es un modal dentro del modal de edición: tampoco debe quedar bajo la barra.
            assertClearOfMobileNav('[aria-labelledby="combo-selection-title"]')
            cy.get('[aria-labelledby="combo-selection-title"]')
                .contains('button', 'Agregar combo')
                .then(($button) => assertNotCovered($button, 'Agregar combo'))
            cy.get('[aria-labelledby="combo-selection-title"]')
                .contains('button', 'Cancelar')
                .then(($button) => assertNotCovered($button, 'Cancelar'))
        })
    })
})

export {}
