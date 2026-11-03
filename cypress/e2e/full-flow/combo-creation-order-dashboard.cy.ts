const businessId = 'business-combo-full-flow-e2e'
const menuId = 'menu-combo-full-flow-e2e'
const categoryId = 'category-combo-full-flow-e2e'
const comboId = 'combo-full-flow-e2e'
const orderId = 'order-combo-full-flow-e2e'
const slug = 'combo-full-flow-e2e'

const catalogProducts = [
    ['burger', 'Hamburguesa clásica', 120],
    ['fries', 'Papas gajo', 45],
    ['wings', 'Alitas BBQ', 70],
    ['nuggets', 'Nuggets', 60],
    ['water', 'Agua de horchata', 30],
    ['soda', 'Refresco', 35],
].map(([id, name, price], sortOrder) => ({
    id: `product-${id}-full-flow-e2e`,
    name,
    price: Number(price),
    businessId,
    categoryId,
    description: null,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    type: 'PRODUCT',
    sortOrder,
    optionGroups: [],
}))

const menu = {
    id: menuId,
    businessId,
    name: 'Menú de combos E2E',
    description: null,
    isActive: true,
    categories: [
        {
            id: categoryId,
            businessId,
            menuId,
            name: 'Combos',
            description: null,
            sortOrder: 0,
            isActive: true,
            products: [],
        },
    ],
}

const product = (id: string) =>
    catalogProducts.find(
        (item) => item.id === id || item.id === `product-${id}-full-flow-e2e`,
    )!

function choice(id: string, productId: string, sortOrder: number) {
    const item = product(productId)
    return {
        id,
        productId,
        sortOrder,
        product: {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            categoryId,
            isAvailable: true,
        },
    }
}

function toCreatedCombo(body: { name: string; description: string; price: number; includedProductIds: string[]; optionGroups: Array<{ name: string; productIds: string[] }> }) {
    return {
        id: comboId,
        businessId,
        categoryId,
        name: body.name,
        description: body.description,
        price: body.price,
        imageUrl: null,
        sortOrder: 0,
        isAvailable: true,
        type: 'COMBO',
        optionGroups: [],
        includedProducts: body.includedProductIds.map((productId, sortOrder) => ({
            id: `included-${productId}`,
            productId,
            sortOrder,
            product: choice(`included-choice-${productId}`, productId, sortOrder).product,
        })),
        comboOptionGroups: body.optionGroups.map((group, sortOrder) => ({
            id: `group-${sortOrder + 1}-full-flow-e2e`,
            comboProductId: comboId,
            name: group.name,
            minSelections: 1,
            maxSelections: 1,
            sortOrder,
            products: group.productIds.map((productId, choiceSortOrder) =>
                choice(`choice-${productId}`, productId, choiceSortOrder),
            ),
        })),
    }
}

function dialog() {
    return cy.get('[data-testid="combo-creation-dialog"]')
}

function installAuthenticatedCatalogApi(createdCombo: { name: string; description: string; price: number; includedProductIds: string[]; optionGroups: Array<{ name: string; productIds: string[] }> } | null) {
    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: { business: { id: businessId, name: 'Restaurante E2E', slug } },
    })
    cy.intercept('GET', '**/businesses/mine/menus', { statusCode: 200, body: [menu] }).as('getMenus')
    cy.intercept('GET', `**/businesses/menus/${menuId}`, { statusCode: 200, body: menu }).as('getMenu')
    cy.intercept('GET', '**/businesses/mine/products', {
        statusCode: 200,
        body: [...catalogProducts, ...(createdCombo ? [toCreatedCombo(createdCombo)] : [])],
    })
    cy.intercept('GET', `**/businesses/${businessId}/products*`, {
        statusCode: 200,
        body: { products: catalogProducts, page: 1, limit: 100, total: catalogProducts.length },
    })
    cy.intercept('GET', '**/businesses/settings', { statusCode: 200, body: { currency: 'MXN', timezone: 'America/Mazatlan' } })
    cy.intercept('GET', `**/businesses/categories/${categoryId}/products`, { statusCode: 200, body: catalogProducts })
    cy.intercept('POST', '**/businesses/products/combos', (request) => {
        request.alias = 'createComboFullFlow'
        request.reply({ statusCode: 201, body: { combo: toCreatedCombo(request.body) } })
    })
}

function createComboThroughUi() {
    cy.login()
    cy.visit('/create-menu')
    cy.wait('@getMenus')
    cy.contains('button', menu.name).click()
    cy.wait('@getMenu')
    cy.contains('button', 'Agregar producto').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Combo').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Continuar con combo').click()
    dialog().find('input[placeholder="Nombre del combo"]').type('Combo familiar completo')
    dialog().contains('label', 'Precio').find('input').type('299')
    dialog().contains('button', 'Continuar').click()
    dialog().contains('button', 'Hamburguesa clásica').click()
    dialog().contains('button', 'Papas gajo').click()
    dialog().contains('button', 'Continuar').click()
    dialog().contains('button', 'Alitas BBQ').click()
    dialog().contains('button', 'Nuggets').click()
    dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
    dialog().contains('button', 'Agregar grupo al combo').click()
    dialog().contains('button', 'Agua de horchata').click()
    dialog().contains('button', 'Refresco').click()
    dialog().find('input[aria-label="Nombre del grupo"]').type('Bebida')
    dialog().contains('button', 'Agregar grupo al combo').click()
    dialog().contains('button', 'Continuar').click()
    dialog().contains('button', 'Crear combo').click()
    cy.wait('@createComboFullFlow').its('request.body').should('deep.equal', {
        categoryId,
        name: 'Combo familiar completo',
        description: '',
        price: 299,
        includedProductIds: [product('burger').id, product('fries').id],
        optionGroups: [
            { name: 'Acompañamiento', productIds: [product('wings').id, product('nuggets').id], minSelections: 1, maxSelections: 1 },
            { name: 'Bebida', productIds: [product('water').id, product('soda').id], minSelections: 1, maxSelections: 1 },
        ],
    })
}

describe('Flujo completo de combo: creación, pedido y detalle', () => {
    it('crea un combo, lo pide con opciones y muestra todo en la orden', () => {
        const createdCombo = toCreatedCombo({
            name: 'Combo familiar completo',
            description: '',
            price: 299,
            includedProductIds: [product('burger').id, product('fries').id],
            optionGroups: [
                { name: 'Acompañamiento', productIds: [product('wings').id, product('nuggets').id] },
                { name: 'Bebida', productIds: [product('water').id, product('soda').id] },
            ],
        })
        let createdOrder!: Record<string, unknown>
        installAuthenticatedCatalogApi(null)
        createComboThroughUi()

        cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
            statusCode: 200,
            body: {
                business: { id: businessId, name: 'Restaurante E2E', slug, description: null, logoUrl: null, logoBlurUrl: null, coverUrl: null, coverBlurUrl: null, ubication: 'Mazatlán', ubicationMaps: null, businessSchedule: null, whatsappNumber: '+526691234567' },
                menus: [{ ...menu, categories: [{ ...menu.categories[0], products: [createdCombo] }] }],
            },
        }).as('getPublicComboCatalog')
        cy.intercept('POST', '**/businesses/*/orders', (request) => {
            request.alias = 'createComboOrderFullFlow'
            const selectedIds = request.body.items[0].comboChoiceIds as string[]
            const selectedNames = new Map([
                [`choice-${product('wings').id}`, 'Alitas BBQ'],
                [`choice-${product('nuggets').id}`, 'Nuggets'],
                [`choice-${product('water').id}`, 'Agua de horchata'],
                [`choice-${product('soda').id}`, 'Refresco'],
            ])
            createdOrder = {
                id: orderId,
                orderNumber: 9001,
                status: 'PENDING',
                customerId: null,
                customerName: request.body.customer.name,
                customerPhone: request.body.customer.phone,
                subtotal: 299,
                total: 299,
                items: [{
                    id: 'order-item-combo-full-flow-e2e',
                    productId: comboId,
                    productName: 'Combo familiar completo',
                    quantity: 1,
                    unitPrice: 299,
                    subtotal: 299,
                    options: [
                        { name: 'Hamburguesa clásica', groupName: 'Productos incluidos', price: 0 },
                        { name: 'Papas gajo', groupName: 'Productos incluidos', price: 0 },
                        { name: selectedNames.get(selectedIds[0])!, groupName: 'Acompañamiento', price: 0 },
                        { name: selectedNames.get(selectedIds[1])!, groupName: 'Bebida', price: 0 },
                    ],
                }],
                statusHistory: [{ id: 'history-combo-full-flow-e2e', status: 'PENDING', createdAt: '2026-11-01T18:00:00.000Z' }],
                createdAt: '2026-11-01T18:00:00.000Z',
                updatedAt: '2026-11-01T18:00:00.000Z',
            }
            request.reply({ statusCode: 201, body: { order: createdOrder } })
        })

        cy.visit(`/${slug}`)
        cy.wait('@getPublicComboCatalog').its('response.body.menus.0.categories.0.products.0.name').should('eq', 'Combo familiar completo')
        cy.contains('h3', 'Combo familiar completo')
            .closest('article')
            .contains('button', 'Seleccionar opciones')
            .click()
        cy.get('[role="dialog"][aria-labelledby="customize-title"]').within(() => {
            cy.contains('Hamburguesa clásica').should('be.visible')
            cy.contains('Papas gajo').should('be.visible')
            cy.contains('label', 'Alitas BBQ').click()
            cy.contains('label', 'Agua de horchata').click()
            cy.contains('button', 'Agregar al pedido').click()
        })
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type('Cliente combo completo')
        cy.get('#customer-phone').type('6695559001')
        cy.contains('[role="dialog"] button', 'Confirmar pedido').click()
        cy.wait('@createComboOrderFullFlow').its('request.body.items').should('deep.equal', [{
            productId: comboId,
            quantity: 1,
            optionIds: [],
            comboChoiceIds: [
                `choice-${product('wings').id}`,
                `choice-${product('water').id}`,
            ],
        }])

        cy.then(() => {
            cy.intercept('GET', '**/businesses/settings', { statusCode: 200, body: { currency: 'MXN', timezone: 'America/Mazatlan' } })
            cy.intercept('GET', '**/businesses/*/orders*', { statusCode: 200, body: { orders: [createdOrder], page: 1, limit: 20, total: 1 } }).as('getComboOrders')
            cy.intercept('GET', `**/businesses/orders/${orderId}`, { statusCode: 200, body: { order: createdOrder } }).as('getComboOrderDetail')
        })
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@getComboOrders')
        cy.get('article').contains('button', '#9001').click()
        cy.wait('@getComboOrderDetail')
        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]').within(() => {
            cy.contains('Combo familiar completo').should('be.visible')
            cy.contains('Productos incluidos').should('be.visible')
            cy.contains('li', 'Hamburguesa clásica').should('be.visible')
            cy.contains('li', 'Papas gajo').should('be.visible')
            cy.contains('Acompañamiento').should('be.visible')
            cy.contains('li', 'Alitas BBQ').should('be.visible')
            cy.contains('Bebida').should('be.visible')
            cy.contains('li', 'Agua de horchata').should('be.visible')
        })
    })
})

export {}
