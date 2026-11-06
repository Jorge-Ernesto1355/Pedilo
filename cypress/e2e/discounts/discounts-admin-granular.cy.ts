type Discount = {
    id: string
    name: string
    type: 'PERCENT' | 'FIXED'
    value: number
    scope: 'MENU' | 'PRODUCTS' | 'CATEGORIES'
    status: 'ACTIVE' | 'FINISHED' | 'DELETED' | 'EXPIRED' | 'SCHEDULED' | 'NO_PRODUCTS'
    endsAt: string
    target_summary: string
    product_ids?: string[]
    category_ids?: string[]
    menu_ids?: string[]
}

const menu = {
    id: 'menu-discounts-e2e',
    name: 'Menú Cypress',
    description: null,
    isActive: true,
    categories: [
        {
            id: 'category-discounts-e2e',
            menuId: 'menu-discounts-e2e',
            name: 'Hamburguesas',
            description: null,
            isActive: true,
            sortOrder: 0,
            products: [
                { id: 'product-burger-discounts-e2e', name: 'Hamburguesa Cypress', categoryId: 'category-discounts-e2e', price: 200 },
                { id: 'product-fries-discounts-e2e', name: 'Papas Cypress', categoryId: 'category-discounts-e2e', price: 80 },
            ],
        },
    ],
}

function activeDiscount(id: string, name: string, type: 'PERCENT' | 'FIXED', value: number): Discount {
    return { id, name, type, value, scope: 'PRODUCTS', status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: '2 productos', product_ids: ['product-burger-discounts-e2e', 'product-fries-discounts-e2e'] }
}

function stubCommon(discounts: Discount[] | (() => Discount[])) {
    cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [menu] } }).as('menus')
    cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: typeof discounts === 'function' ? discounts() : discounts } })).as('discounts')
}

describe('Descuentos · administración granular', () => {
    beforeEach(() => {
        cy.login()
        cy.intercept('GET', '**/businesses/mine', { statusCode: 200, body: { business: { id: 'business-discounts-e2e', name: 'Restaurante Cypress' } } }).as('businessMine')
    })

    it('ADM-01: carga skeleton y después muestra descuentos activos y vencidos', () => {
        const discounts = [activeDiscount('discount-active-e2e', 'Fin de semana', 'PERCENT', 20), { ...activeDiscount('discount-expired-e2e', 'Promoción pasada', 'FIXED', 25), status: 'EXPIRED' as const }]
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [menu] } })
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ delay: 300, statusCode: 200, body: { discounts } })).as('loadDiscounts')
        cy.visit('/dashboard/discounts')
        cy.get('[data-cy="discount-admin-skeleton"]').should('be.visible')
        cy.wait('@loadDiscounts')
        cy.contains('Fin de semana').should('be.visible')
        cy.contains('Activo').should('be.visible')
        cy.contains('Promoción pasada').should('be.visible')
        cy.contains('Vencido').should('be.visible')
    })

    it('ADM-02: muestra error amigable y permite reintentar la consulta', () => {
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [menu] } })
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/, times: 1 }, { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } } }).as('discountsFail')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, { statusCode: 200, body: { discounts: [activeDiscount('discount-retry-e2e', 'Descuento recuperado', 'PERCENT', 10)] } }).as('discountsRetry')
        cy.visit('/dashboard/discounts')
        cy.location('pathname').should('eq', '/dashboard/discounts')
        cy.wait('@discountsFail')
        cy.get('[role="alert"]').should('contain', 'No pudimos cargar tus descuentos')
        cy.contains('Reintentar').click()
        cy.wait('@discountsRetry')
        cy.contains('Descuento recuperado').should('be.visible')
    })

    it('ADM-03: busca por nombre y filtra por porcentaje o monto fijo', () => {
        stubCommon([activeDiscount('percent-e2e', 'Porcentaje lunch', 'PERCENT', 15), { ...activeDiscount('fixed-e2e', 'Monto especial', 'FIXED', 30) }])
        cy.visit('/dashboard/discounts')
        cy.wait('@discounts')
        cy.get('[data-cy="discount-search"]').type('lunch')
        cy.contains('Porcentaje lunch').should('be.visible')
        cy.contains('Monto especial').should('not.exist')
        cy.get('[data-cy="discount-search"]').clear()
        cy.get('[data-cy="discount-type-filter"]').select('Monto fijo')
        cy.contains('Monto especial').should('be.visible')
        cy.contains('Porcentaje lunch').should('not.exist')
    })

    it('ADM-04: expande productos ligados mostrando cobertura y precios', () => {
        const discount = activeDiscount('discount-products-e2e', 'Productos ligados', 'PERCENT', 20)
        stubCommon([discount])
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/discount-products-e2e\/products\/?$/ }, { statusCode: 200, body: { products: [{ id: menu.categories[0].products[0].id, name: 'Hamburguesa Cypress', price: 200, priceOriginal: 200, priceFinal: 160 }] } }).as('coverage')
        cy.visit('/dashboard/discounts')
        cy.wait('@discounts')
        cy.get('[aria-label="Ver productos ligados"]').click()
        cy.wait('@coverage')
        cy.contains('Productos ligados (1)').should('be.visible')
        cy.contains('$200.00').should('be.visible')
        cy.contains('$160.00').should('be.visible')
    })

    it('ADM-05: finaliza y elimina un descuento con confirmación', () => {
        const discount = activeDiscount('discount-actions-e2e', 'Descuento para eliminar', 'PERCENT', 20)
        let actionStatus: Discount['status'] = 'ACTIVE'
        stubCommon([discount])
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/discount-actions-e2e\/?$/ }, (request) => request.reply({ statusCode: 200, body: { discount: { ...discount, status: actionStatus } } }))
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/discount-actions-e2e\/end\/?$/ }, (request) => { actionStatus = 'FINISHED'; request.reply({ statusCode: 200, body: { ended: true, status: 'FINISHED' } }) }).as('endDiscount')
        cy.intercept({ method: 'DELETE', url: /\/businesses\/[^/]+\/discounts\/discount-actions-e2e\/?$/ }, (request) => { actionStatus = 'DELETED'; request.reply({ statusCode: 204 }) }).as('deleteDiscount')
        cy.visit('/dashboard/discounts')
        cy.wait('@discounts')
        cy.contains('Finalizar').click()
        cy.wait('@endDiscount')
        cy.on('window:confirm', () => true)
        cy.get('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deleteDiscount')
    })

    it('ADM-06: ordena del descuento más nuevo al más antiguo y conserva toda su información', () => {
        const newest = { ...activeDiscount('newest-discount-e2e', 'Descuento más nuevo', 'FIXED', 35), scope: 'MENU' as const, target_summary: '2 menús', menu_ids: ['menu-discounts-e2e'] }
        const older = { ...activeDiscount('older-discount-e2e', 'Descuento antiguo', 'PERCENT', 10), status: 'EXPIRED' as const, target_summary: '1 producto' }
        stubCommon([newest, older])
        cy.visit('/dashboard/discounts')
        cy.wait('@discounts')
        cy.get('[data-cy="discount-card"]').should('have.length', 2).first().should('have.attr', 'data-discount-id', 'newest-discount-e2e').within(() => {
            cy.contains('Descuento más nuevo').should('be.visible')
            cy.contains('$35.00 de descuento').should('be.visible')
            cy.contains('Activo').should('be.visible')
            cy.contains('2 menús').should('be.visible')
        })
        cy.get('[data-cy="discount-card"]').eq(1).should('have.attr', 'data-discount-id', 'older-discount-e2e').within(() => {
            cy.contains('Descuento antiguo').should('be.visible')
            cy.contains('10% de descuento').should('be.visible')
            cy.contains('Vencido').should('be.visible')
        })
    })

    it('ADM-07: representa un descuento programado y uno sin productos', () => {
        const scheduled = { ...activeDiscount('scheduled-discount-e2e', 'Próximamente', 'PERCENT', 25), status: 'SCHEDULED' as const }
        const empty = { ...activeDiscount('empty-discount-e2e', 'Sin cobertura', 'FIXED', 50), status: 'NO_PRODUCTS' as const, target_summary: '0 productos' }
        stubCommon([scheduled, empty])
        cy.visit('/dashboard/discounts')
        cy.wait('@discounts')
        cy.contains('Próximamente').parents('[data-cy="discount-card"]').should('contain', 'Programado')
        cy.contains('Sin cobertura').parents('[data-cy="discount-card"]').should('contain', 'Sin productos')
    })
})
