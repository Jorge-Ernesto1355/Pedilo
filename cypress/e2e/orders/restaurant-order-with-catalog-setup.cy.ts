export {}

type CatalogState = {
    menu: {
        id: string
        name: string
        description: string
        isActive: boolean
        categories: Array<{
            id: string
            menuId: string
            name: string
            description: string
            isActive: boolean
            sortOrder: number
            products: Array<typeof product>
        }>
    } | null
    product: typeof product | null
}

const businessId = 'business-restaurant-order-complete'
const menuId = 'menu-restaurant-order-complete'
const categoryId = 'category-restaurant-order-complete'
const productId = 'product-restaurant-order-complete'

const product = {
    id: productId,
    name: 'Hamburguesa creada E2E',
    categoryId,
    description: 'Producto creado durante la prueba',
    price: 95,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    sortOrder: 1,
    optionGroups: [],
}

function createState(): CatalogState {
    return { menu: null, product: null }
}

function requestField(body: unknown, field: string, fallback: string) {
    if (body && typeof body === 'object' && field in body) {
        const value = (body as Record<string, unknown>)[field]
        return value == null ? fallback : String(value)
    }

    if (typeof body === 'string') {
        const match = body.match(new RegExp(`name="${field}"[\\s\\S]*?\\r?\\n\\r?\\n([^\\r\\n]*)`))
        if (match?.[1]) return match[1]
    }

    return fallback
}

function installCatalogSetupApi(state: CatalogState) {
    cy.intercept('GET', '**/businesses/mine/menus', (request) => {
        request.alias = 'listMenus'
        request.reply({ statusCode: 200, body: state.menu ? [state.menu] : [] })
    })

    cy.intercept('GET', `**/businesses/menus/${menuId}`, (request) => {
        request.alias = 'getMenu'
        request.reply({ statusCode: 200, body: state.menu })
    })

    cy.intercept('POST', '**/businesses/*/menus', (request) => {
        request.alias = 'createMenu'
        const body = request.body as { name: string; description: string }
        state.menu = {
            id: menuId,
            name: body.name,
            description: body.description,
            isActive: true,
            categories: [],
        }
        request.reply({ statusCode: 201, body: state.menu })
    })

    cy.intercept('POST', '**/businesses/*/categories', (request) => {
        request.alias = 'createCategory'
        const body = request.body as { menuId: string; name: string; description: string }
        if (!state.menu) throw new Error('El menú E2E debe existir antes de crear la categoría.')
        state.menu.categories = [
            {
                id: categoryId,
                menuId: body.menuId,
                name: body.name,
                description: body.description,
                isActive: true,
                sortOrder: 0,
                products: [],
            },
        ]
        request.reply({ statusCode: 201, body: state.menu.categories[0] })
    })

    cy.intercept('POST', '**/businesses/*/products', (request) => {
        request.alias = 'createProduct'
        if (!state.menu) throw new Error('El menú E2E debe existir antes de crear el producto.')
        state.product = {
            ...product,
            name: requestField(request.body, 'name', product.name),
            description: requestField(request.body, 'description', product.description),
            price: Number(requestField(request.body, 'price', String(product.price))),
            categoryId: requestField(request.body, 'categoryId', categoryId),
        }
        const category = state.menu.categories[0]
        if (category) category.products = [state.product]
        request.reply({ statusCode: 201, body: state.product })
    })

    cy.intercept('GET', `**/businesses/categories/${categoryId}/products`, (request) => {
        request.alias = 'categoryProducts'
        request.reply({
            statusCode: 200,
            body: state.product ? [state.product] : [],
        })
    })

    cy.intercept('GET', '**/businesses/*/products*', (request) => {
        request.alias = 'listProducts'
        request.reply({
            statusCode: 200,
            body: {
                products: state.product ? [state.product] : [],
                page: 1,
                limit: 100,
                total: state.product ? 1 : 0,
            },
        })
    })
}

function installOrderApi(state: CatalogState) {
    let createdOrder: Record<string, unknown> | null = null
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-restaurant-order-complete',
            businessId,
            currency: 'MXN',
            timezone: 'America/Mazatlan',
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', {
        statusCode: 200,
        body: { orders: [], page: 1, limit: 20, total: 0 },
    }).as('orders')

    cy.intercept('GET', '**/businesses/orders/order-restaurant-order-complete', (request) => {
        request.alias = 'orderDetail'
        request.reply({ statusCode: 200, body: { order: createdOrder } })
    })

    cy.intercept('POST', '**/businesses/*/orders/restaurant', (request) => {
        request.alias = 'createRestaurantOrder'
        expect(request.body).to.deep.equal({
            customerName: 'Juan E2E',
            customerPhone: '6681234567',
            notes: 'Sin cebolla',
            items: [{ productId, quantity: 2, optionIds: [] }],
        })
        expect(request.body).not.to.have.any.keys(
            'price',
            'subtotal',
            'total',
            'source',
            'status',
            'businessId',
        )
        createdOrder = {
            id: 'order-restaurant-order-complete',
            businessId,
            customerId: null,
            orderNumber: 1,
            status: 'PENDING',
            source: 'RESTAURANT',
            subtotal: 190,
            total: 190,
            customerName: 'Juan E2E',
            customerPhone: '6681234567',
            notes: 'Sin cebolla',
            items: [
                {
                    id: 'item-restaurant-order-complete',
                    productId,
                    productName: product.name,
                    quantity: 2,
                    unitPrice: 95,
                    subtotal: 190,
                    options: [],
                },
            ],
            statusHistory: [
                {
                    id: 'history-restaurant-order-complete',
                    status: 'PENDING',
                    createdAt: '2026-10-06T10:00:00.000Z',
                },
            ],
            createdAt: '2026-10-06T10:00:00.000Z',
            updatedAt: '2026-10-06T10:00:00.000Z',
        }
        request.reply({
            statusCode: 201,
            body: {
                order: createdOrder,
            },
        })
    })

    cy.intercept('GET', '**/businesses/mine/menus', (request) => {
        request.alias = 'orderMenus'
        request.reply({ statusCode: 200, body: state.menu ? [state.menu] : [] })
    })
}

describe('E2E completo: crear catálogo y ordenar desde Pedidos', () => {
    it('inicia sesión, crea menú/categoría/producto y crea una orden con ese producto', () => {
        const state = createState()

        cy.login()
        cy.location('pathname').should('eq', '/dashboard')

        installCatalogSetupApi(state)
        cy.visit('/create-menu')
        cy.wait('@listMenus')

        cy.contains('button', 'Crear menú').first().click()
        cy.get('[role="dialog"]').within(() => {
            cy.get('#menu-name').type('Menú E2E completo')
            cy.get('#menu-description').type('Menú creado durante la prueba completa.')
            cy.contains('button', 'Crear menú').click()
        })
        cy.wait('@createMenu')
        cy.contains('button', 'Menú E2E completo').click()
        cy.wait('@getMenu')

        cy.contains('button', 'Agregar').click()
        cy.get('input[placeholder="Nombre de categoría"]').type('Comidas E2E')
        cy.get('textarea[placeholder="Descripción (opcional)"]').type('Productos creados para E2E.')
        cy.contains('button', 'Guardar categoría').click()
        cy.wait('@createCategory')

        cy.contains('button', 'Agregar producto').click()
        cy.get('#product-name').type(product.name)
        cy.get('#product-description').type(product.description)
        cy.get('#product-price').type(String(product.price))
        cy.get('[role="dialog"] button[type="submit"]').contains('Crear producto').click()
        cy.wait('@createProduct')
        cy.wait('@categoryProducts')
        cy.get('[role="dialog"] button[aria-label="Cerrar"]').last().click()
        cy.contains(product.name).should('be.visible')

        installOrderApi(state)
        cy.visit('/dashboard/orders')
        cy.wait('@orders')
        cy.contains('h1', 'Pedidos').should('be.visible')
        cy.contains('button', '+ Nueva orden').click()

        cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]')
            .should('be.visible')
            .within(() => {
                cy.wait('@orderMenus')
                cy.contains(product.name).should('be.visible')
                cy.contains('button', 'Agregar al carrito').click()
                cy.get(`button[aria-label="Agregar una unidad de ${product.name}"]`).click()
                cy.contains('2 productos').should('be.visible')
                cy.contains('button', 'Continuar').click()
            })

        cy.contains('Todos son opcionales.').should('be.visible')
        cy.get('input[autocomplete="name"]').type('Juan E2E')
        cy.get('input[autocomplete="tel"]').type('6681234567')
        cy.get('textarea').type('Sin cebolla')
        cy.contains('button', 'Crear orden').click()
        cy.wait('@createRestaurantOrder')
        cy.wait('@orders')
        cy.contains('h3', 'Orden creada').should('be.visible')
        cy.contains('Orden #1').should('be.visible')
        cy.contains('Total confirmado:').should('contain', '$190.00')
        cy.contains('button', 'Ver orden').click()
        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('Pedido #1').should('be.visible')
                cy.contains('Estado actual').should('be.visible')
                cy.contains('Nueva').should('be.visible')
                cy.contains('$190.00').should('be.visible')
                cy.contains('Cliente').should('be.visible')
                cy.contains('Juan E2E').should('be.visible')
                cy.contains('6681234567').should('be.visible')
                cy.contains('Sin cebolla').should('be.visible')
                cy.contains('Productos').should('be.visible')
                cy.contains('2 × Hamburguesa creada E2E').should('be.visible')
                cy.contains('Historial de la orden').should('be.visible')
                cy.contains('Nueva').should('be.visible')
                cy.contains('Actual').should('be.visible')
                cy.get('time[datetime="2026-10-06T10:00:00.000Z"]').should('be.visible')
            })
    })
})
