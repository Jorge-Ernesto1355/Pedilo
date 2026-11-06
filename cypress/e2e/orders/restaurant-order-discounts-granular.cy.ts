export {}

const businessId = 'business-restaurant-order-discounts-e2e'
const menuFoodId = 'menu-restaurant-order-discounts-food'
const menuDrinksId = 'menu-restaurant-order-discounts-drinks'
const categoryFoodId = 'category-restaurant-order-discounts-food'
const categoryDrinksId = 'category-restaurant-order-discounts-drinks'

const products = [
    { id: 'product-discount-burger', name: 'Hamburguesa con descuento', price: 100, categoryId: categoryFoodId },
    { id: 'product-discount-coke', name: 'Coca con descuento', price: 50, categoryId: categoryDrinksId },
    { id: 'product-discount-sushi', name: 'Sushi con descuento', price: 80, categoryId: categoryFoodId },
    { id: 'product-discount-plain', name: 'Producto sin descuento', price: 30, categoryId: categoryDrinksId },
].map((product, sortOrder) => ({
    ...product,
    businessId,
    description: null,
    imageUrl: null,
    imageBlurUrl: null,
    isAvailable: true,
    active: true,
    sortOrder,
    optionGroups: [],
    type: 'PRODUCT',
}))

const menus = [
    {
        id: menuFoodId,
        businessId,
        name: 'Comidas con descuentos',
        description: null,
        isActive: true,
        categories: [{ id: categoryFoodId, menuId: menuFoodId, businessId, name: 'Comidas', description: null, sortOrder: 0, isActive: true, products: [products[0], products[2]] }],
    },
    {
        id: menuDrinksId,
        businessId,
        name: 'Bebidas con descuentos',
        description: null,
        isActive: true,
        categories: [{ id: categoryDrinksId, menuId: menuDrinksId, businessId, name: 'Bebidas', description: null, sortOrder: 0, isActive: true, products: [products[1], products[3]] }],
    },
]

function activeDiscount(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'discount-active-product',
        name: 'Descuento activo',
        type: 'PERCENT',
        value: 10,
        scope: 'PRODUCTS',
        status: 'ACTIVE',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2027-01-01T00:00:00.000Z',
        createdAt: '2026-11-06T20:00:00.000Z',
        product_ids: ['product-discount-burger'],
        category_ids: [],
        menu_ids: [],
        ...overrides,
    }
}

function installApi(discounts: unknown[] | (() => unknown[]), options: { discountsError?: boolean } = {}) {
    cy.intercept('GET', '**/businesses/settings', { statusCode: 200, body: { currency: 'MXN', timezone: 'America/Mazatlan' } })
    cy.intercept('GET', '**/businesses/*/orders*', { statusCode: 200, body: { orders: [], page: 1, limit: 20, total: 0 } }).as('orders')
    cy.intercept('GET', '**/businesses/mine', { statusCode: 200, body: { business: { id: businessId, name: 'Restaurante descuentos', slug: 'restaurant-order-discounts-e2e' } } }).as('mine')
    cy.intercept('GET', '**/businesses/mine/menus', { statusCode: 200, body: menus }).as('restaurantMenus')
    cy.intercept('GET', '**/businesses/*/products*', { statusCode: 200, body: { products, page: 1, limit: 100, total: products.length } }).as('restaurantProducts')
    cy.intercept('GET', '**/businesses/*/discounts', (request) => {
        request.alias = 'restaurantDiscounts'
        if (options.discountsError) {
            request.reply({ statusCode: 503, body: { error: { code: 'INTERNAL_ERROR' } } })
            return
        }
        request.reply({ statusCode: 200, body: { discounts: typeof discounts === 'function' ? discounts() : discounts } })
    })
}

function openNewOrder() {
    cy.contains('button', '+ Nueva orden').click()
    cy.get('[role="dialog"][aria-labelledby="new-restaurant-order-title"]').should('be.visible')
    cy.wait('@restaurantMenus')
    cy.wait('@restaurantProducts')
    cy.wait('@restaurantDiscounts')
}

function visitOrders() {
    cy.visit('/dashboard/orders')
    cy.wait('@orders')
}

function productCard(productId: string) {
    return cy.get(`[data-cy="public-product-card"][data-product-id="${productId}"]`)
}

describe('Nueva orden: descuentos activos en el catálogo interno', () => {
    beforeEach(() => {
        cy.login()
    })

    it('carga descuentos por producto, categoría y menú con precio final correcto', () => {
        installApi([
            activeDiscount({ id: 'discount-product', name: 'Producto 15%', value: 15, createdAt: '2026-11-06T19:00:00.000Z', product_ids: ['product-discount-burger'] }),
            activeDiscount({ id: 'discount-category', name: 'Categoría 10%', value: 10, scope: 'CATEGORIES', createdAt: '2026-11-06T19:30:00.000Z', product_ids: [], category_ids: [categoryDrinksId] }),
            activeDiscount({ id: 'discount-menu', name: 'Menú 25%', value: 25, scope: 'MENU', createdAt: '2026-11-06T20:00:00.000Z', product_ids: [], category_ids: [], menu_ids: [menuFoodId] }),
        ])
        visitOrders()
        openNewOrder()
        productCard('product-discount-burger').should('contain', '$75.00').and('contain', '$100.00').and('contain', '-25%')
        productCard('product-discount-coke').should('contain', '$45.00').and('contain', '-10%')
        productCard('product-discount-sushi').should('contain', '$60.00').and('contain', '-25%')
        productCard('product-discount-plain').should('contain', '$30.00').and('not.contain', 'descuento')
    })

    it('prioriza el descuento más reciente para el mismo producto', () => {
        installApi([
            activeDiscount({ id: 'discount-old', name: 'Anterior 10%', value: 10, createdAt: '2026-11-06T19:00:00.000Z' }),
            activeDiscount({ id: 'discount-new', name: 'Nuevo 20%', value: 20, createdAt: '2026-11-06T20:00:00.000Z' }),
        ])
        visitOrders()
        openNewOrder()
        productCard('product-discount-burger').should('contain', '$80.00').and('contain', '-20%').and('not.contain', '-10%')
    })

    it('aplica correctamente un descuento de monto fijo', () => {
        installApi([activeDiscount({ id: 'discount-fixed', name: 'Menos $12', type: 'FIXED', value: 12, product_ids: ['product-discount-coke'] })])
        visitOrders()
        openNewOrder()
        productCard('product-discount-coke').should('contain', '$38.00').and('contain', '-$12.00')
    })

    it('ignora descuentos vencidos, finalizados, eliminados o futuros', () => {
        installApi([
            activeDiscount({ id: 'expired', status: 'ACTIVE', endsAt: '2026-01-01T00:00:00.000Z', product_ids: ['product-discount-burger'] }),
            activeDiscount({ id: 'finished', status: 'FINISHED', product_ids: ['product-discount-coke'] }),
            activeDiscount({ id: 'deleted', status: 'DELETED', scope: 'MENU', product_ids: [], menu_ids: [menuFoodId] }),
            activeDiscount({ id: 'future', startsAt: '2099-01-01T00:00:00.000Z', product_ids: ['product-discount-sushi'] }),
        ])
        visitOrders()
        openNewOrder()
        productCard('product-discount-burger').should('contain', '$100.00').and('not.contain', '-%')
        productCard('product-discount-coke').should('contain', '$50.00').and('not.contain', '-%')
        productCard('product-discount-sushi').should('contain', '$80.00').and('not.contain', '-%')
    })

    it('mantiene disponible el catálogo si falla la consulta de descuentos', () => {
        installApi([], { discountsError: true })
        visitOrders()
        openNewOrder()
        cy.get('[role="dialog"]').should('contain', 'Hamburguesa con descuento')
        productCard('product-discount-burger').should('contain', '$100.00').and('not.contain', '-10%')
        cy.get('[role="dialog"]').should('not.contain', 'Ocurrió un problema')
    })

    it('vuelve a consultar descuentos al cerrar y abrir nuevamente la nueva orden', () => {
        let attempts = 0
        installApi(() => {
            attempts += 1
            return attempts === 1 ? [] : [activeDiscount({ value: 20, product_ids: ['product-discount-burger'] })]
        })
        visitOrders()
        openNewOrder()
        productCard('product-discount-burger').should('contain', '$100.00')
        cy.get('[role="dialog"]').find('button[aria-label="Cerrar"]').click()
        openNewOrder()
        productCard('product-discount-burger').should('contain', '$80.00').and('contain', '-20%')
        cy.then(() => expect(attempts).to.eq(2))
    })

    it('mantiene productos con y sin descuento en el mismo pedido', () => {
        installApi([activeDiscount({ value: 10, product_ids: ['product-discount-burger'] })])
        visitOrders()
        openNewOrder()
        productCard('product-discount-burger').contains('button', 'Agregar al carrito').click()
        productCard('product-discount-plain').contains('button', 'Agregar al carrito').click()
        cy.get('[role="dialog"]').contains('Tu orden').should('contain', '2 productos').and('contain', '$120.00')
        cy.get('[role="dialog"]').contains('button', 'Continuar').click()
        cy.get('[role="dialog"]').should('contain', 'Datos del cliente')
    })
})
