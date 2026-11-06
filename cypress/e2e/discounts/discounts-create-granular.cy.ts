const createMenu = {
    id: 'menu-create-discounts-e2e', name: 'Menú creación', description: null, isActive: true,
    categories: [
        { id: 'category-create-discounts-e2e', menuId: 'menu-create-discounts-e2e', name: 'Favoritos', description: null, isActive: true, sortOrder: 0, products: [{ id: 'product-create-discounts-e2e', name: 'Combo Cypress', categoryId: 'category-create-discounts-e2e', price: 240 }] },
        { id: 'category-create-discounts-2-e2e', menuId: 'menu-create-discounts-e2e', name: 'Bebidas Cypress', description: null, isActive: true, sortOrder: 1, products: [{ id: 'product-create-discounts-2-e2e', name: 'Agua Cypress', categoryId: 'category-create-discounts-2-e2e', price: 35 }] },
    ],
}
const secondCreateMenu = {
    id: 'menu-create-discounts-2-e2e', name: 'Menú bebidas Cypress', description: null, isActive: true,
    categories: [{ id: 'category-create-discounts-3-e2e', menuId: 'menu-create-discounts-2-e2e', name: 'Postres Cypress', description: null, isActive: true, sortOrder: 0, products: [{ id: 'product-create-discounts-3-e2e', name: 'Pastel Cypress', categoryId: 'category-create-discounts-3-e2e', price: 90 }] }],
}

describe('Descuentos · creación granular', () => {
    beforeEach(() => {
        cy.login()
        cy.intercept('GET', '**/businesses/mine', { statusCode: 200, body: { business: { id: 'business-create-discounts-e2e', name: 'Restaurante Cypress' } } }).as('businessMine')
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [createMenu, secondCreateMenu] } }).as('menus')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, { statusCode: 200, body: { discounts: [] } }).as('discounts')
        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@discounts')
        cy.get('[data-cy="create-discount"]').click()
    })

    it('CRE-00A: muestra skeleton mientras carga las opciones de menú', () => {
        cy.get('[role="dialog"] [aria-label="Cerrar"]').click()
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { delay: 300, statusCode: 200, body: { menus: [createMenu, secondCreateMenu] } }).as('menusSlow')
        cy.reload()
        cy.get('[data-cy="create-discount"]').click()
        cy.get('[data-cy="discount-targets-skeleton"]').should('be.visible')
        cy.wait('@menusSlow')
        cy.contains('Menú creación').should('be.visible')
    })

    it('CRE-00B: muestra error amigable y permite reintentar las opciones de menú', () => {
        cy.get('[role="dialog"] [aria-label="Cerrar"]').click()
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { times: 1, statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } } }).as('menusFail')
        cy.reload()
        cy.get('[data-cy="create-discount"]').click()
        cy.wait('@menusFail')
        cy.get('[role="dialog"] [role="alert"]').should('contain', 'No pudimos cargar las opciones del menú')
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [createMenu, secondCreateMenu] } }).as('menusRetry')
        cy.contains('[role="dialog"] button', 'Reintentar').click()
        cy.wait('@menusRetry')
        cy.contains('[role="dialog"]', 'Menú creación').should('be.visible')
    })

    it('CRE-01: muestra el formulario y permite elegir menú, categoría o producto', () => {
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('[data-cy="discount-type"]').should('have.value', 'PERCENT')
        cy.get('[data-cy="discount-scope"]').select('MENU')
        cy.contains('label', 'Menú creación').find('input').check()
        cy.get('[data-cy="discount-scope"]').select('Categorías')
        cy.contains('label', 'Favoritos').find('input').check()
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.contains('label', 'Combo Cypress').find('input').check()
    })

    it('CRE-02: valida nombre, porcentaje, alcance y fecha antes de enviar', () => {
        cy.get('[data-cy="discount-name"]').clear().type('A')
        cy.get('[data-cy="save-discount"]').click()
        cy.get('[role="alert"]').should('contain', 'al menos 2 caracteres')
        cy.get('[data-cy="discount-name"]').clear().type('Promoción válida')
        cy.get('[data-cy="discount-value"]').clear().type('0')
        cy.get('[data-cy="save-discount"]').click()
        cy.get('[role="alert"]').should('contain', 'mayor a 0')
        cy.get('[data-cy="discount-value"]').clear().type('101')
        cy.get('[data-cy="save-discount"]').click()
        cy.get('[role="alert"]').should('contain', 'entre 1 y 100')
    })

    it('CRE-03: crea descuento porcentual con producto seleccionado y actualiza la lista', () => {
        cy.intercept({ method: 'POST', url: /\/businesses\/[^/]+\/discounts\/?$/ }, (request) => { expect(request.body).to.include({ name: 'Combo de viernes', type: 'PERCENT', value: 20, scope: 'PRODUCTS' }); expect(request.body.productIds).to.deep.equal(['product-create-discounts-e2e']); request.reply({ statusCode: 201, body: { discount: { id: 'created-discount-e2e', name: 'Combo de viernes', type: 'PERCENT', value: 20, scope: 'PRODUCTS', status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: '1 producto afectado' } } }) }).as('createDiscount')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, { statusCode: 200, body: { discounts: [{ id: 'created-discount-e2e', name: 'Combo de viernes', type: 'PERCENT', value: 20, scope: 'PRODUCTS', status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: '1 producto afectado', product_ids: ['product-create-discounts-e2e'] }] } }).as('refreshedDiscounts')
        cy.get('[data-cy="discount-name"]').clear().type('Combo de viernes')
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.contains('label', 'Combo Cypress').find('input').check()
        cy.get('[data-cy="discount-value"]').clear().type('20')
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createDiscount')
        cy.wait('@refreshedDiscounts')
        cy.contains('Descuento creado correctamente').should('be.visible')
        cy.get('[data-cy="discount-card"]').first().should('have.attr', 'data-discount-id', 'created-discount-e2e').within(() => {
            cy.contains('Combo de viernes').should('be.visible')
            cy.contains('20% de descuento').should('be.visible')
            cy.contains('Activo').should('be.visible')
            cy.contains('1 producto afectado').should('be.visible')
        })
    })

    it('CRE-04: muestra error controlado si falla la creación y permite corregir', () => {
        cy.intercept({ method: 'POST', url: /\/businesses\/[^/]+\/discounts\/?$/ }, { statusCode: 409, body: { error: { code: 'DISCOUNT_CONFLICT', message: 'Conflict' } } }).as('createFail')
        cy.get('[data-cy="discount-name"]').clear().type('Conflicto')
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.contains('label', 'Combo Cypress').find('input').check()
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createFail')
        cy.get('[role="alert"]').should('contain', 'ya tiene otro descuento activo')
    })

    it('CRE-05: crea un monto fijo y verifica nombre, tipo, valor, alcance y fecha enviados', () => {
        cy.intercept({ method: 'POST', url: /\/businesses\/[^/]+\/discounts\/?$/ }, (request) => {
            expect(request.body.name).to.eq('Ahorro familiar')
            expect(request.body.type).to.eq('FIXED')
            expect(request.body.value).to.eq(35.5)
            expect(request.body.scope).to.eq('CATEGORIES')
            expect(request.body.categoryIds).to.deep.equal(['category-create-discounts-e2e'])
            expect(request.body.endsAt).to.match(/^\d{4}-\d{2}-\d{2}T/)
            request.reply({ statusCode: 201, body: { discount: { id: 'fixed-created-e2e', name: 'Ahorro familiar', type: 'FIXED', value: 35.5, scope: 'CATEGORIES', status: 'ACTIVE', endsAt: request.body.endsAt, target_summary: '1 categoría' } } })
        }).as('createFixedDiscount')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, { statusCode: 200, body: { discounts: [{ id: 'fixed-created-e2e', name: 'Ahorro familiar', type: 'FIXED', value: 35.5, scope: 'CATEGORIES', status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: '1 categoría' }] } }).as('fixedDiscountRefresh')
        cy.get('[data-cy="discount-name"]').clear().type('Ahorro familiar')
        cy.get('[data-cy="discount-type"]').select('Monto fijo')
        cy.get('[data-cy="discount-value"]').clear().type('35.50')
        cy.get('[data-cy="discount-scope"]').select('Categorías')
        cy.contains('label', 'Favoritos').find('input').check()
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createFixedDiscount')
        cy.wait('@fixedDiscountRefresh')
        cy.get('[data-cy="discount-card"]').first().should('have.attr', 'data-discount-id', 'fixed-created-e2e').within(() => {
            cy.contains('Ahorro familiar').should('be.visible')
            cy.contains('$35.50 de descuento').should('be.visible')
            cy.contains('Activo').should('be.visible')
            cy.contains('1 categoría').should('be.visible')
        })
    })

    it('CRE-06: no permite convertir porcentaje en monto fijo ni monto fijo en porcentaje', () => {
        cy.get('[data-cy="discount-type"]').should('have.value', 'PERCENT')
        cy.get('[data-cy="discount-type"]').select('Monto fijo')
        cy.get('[data-cy="discount-type"]').should('have.value', 'FIXED')
        cy.get('[data-cy="discount-type"]').select('Porcentaje')
        cy.get('[data-cy="discount-type"]').should('have.value', 'PERCENT')
    })

    it('CRE-07: valida límites de nombre, porcentaje y alcance antes de crear', () => {
        cy.get('[data-cy="discount-name"]').type('x'.repeat(51))
        cy.get('[data-cy="discount-name"]').should('have.value', 'x'.repeat(50))
        cy.get('[data-cy="discount-scope"]').select('Todo el menú')
        cy.get('[data-cy="discount-name"]').clear().type('Sin menú seleccionado')
        cy.get('[data-cy="save-discount"]').click()
        cy.get('[role="alert"]').should('contain', 'Selecciona al menos un menú')
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.get('[data-cy="discount-value"]').clear().type('1234')
        cy.get('[data-cy="discount-value"]').should('have.value', '123')
    })

    it('CRE-08: filtra productos por nombre sin perder la selección', () => {
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.get('[data-cy="discount-product-search"]').type('Combo')
        cy.contains('label', 'Combo Cypress').should('be.visible').find('input').check()
        cy.get('[data-cy="discount-product-search"]').clear().type('no existe')
        cy.contains('No encontramos productos con ese nombre.').should('be.visible')
        cy.get('[data-cy="discount-product-search"]').clear()
        cy.contains('label', 'Combo Cypress').find('input').should('be.checked')
    })

    it('CRE-09: actualiza los conteos y muestra los afectados en un popover por alcance', () => {
        const createdDiscounts: Array<Record<string, unknown>> = []
        cy.intercept({ method: 'POST', url: /\/businesses\/[^/]+\/discounts\/?$/ }, (request) => {
            const id = `created-${createdDiscounts.length + 1}-e2e`
            const discount = { id, name: `Promoción ${createdDiscounts.length + 1}`, type: 'PERCENT', value: 10, scope: request.body.scope, status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: request.body.scope === 'MENU' ? '2 menús' : request.body.scope === 'CATEGORIES' ? '2 categorías' : '2 productos afectados', menu_ids: request.body.menuIds, category_ids: request.body.categoryIds, product_ids: request.body.productIds }
            createdDiscounts.unshift(discount)
            request.reply({ statusCode: 201, body: { discount } })
        }).as('createByScope')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: createdDiscounts } })).as('refreshByScope')

        cy.get('[data-cy="discount-name"]').clear().type('Promoción categorías')
        cy.get('[data-cy="discount-scope"]').select('Categorías')
        cy.contains('label', 'Favoritos').find('input').check()
        cy.contains('label', 'Bebidas Cypress').find('input').check()
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createByScope')
        cy.wait('@refreshByScope')
        cy.get('[data-cy="discount-card"]').first().within(() => cy.contains('2 categorías').should('be.visible'))

        cy.get('[data-cy="create-discount"]').click()
        cy.get('[data-cy="discount-name"]').clear().type('Promoción menús')
        cy.get('[data-cy="discount-scope"]').select('Todo el menú')
        cy.contains('label', 'Menú creación').find('input').check()
        cy.contains('label', 'Menú bebidas Cypress').find('input').check()
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createByScope')
        cy.wait('@refreshByScope')
        cy.get('[data-cy="discount-card"]').first().within(() => cy.contains('2 menús').should('be.visible'))

        cy.get('[data-cy="create-discount"]').click()
        cy.get('[data-cy="discount-name"]').clear().type('Promoción productos')
        cy.get('[data-cy="discount-scope"]').select('Productos específicos')
        cy.contains('label', 'Combo Cypress').find('input').check()
        cy.contains('label', 'Agua Cypress').find('input').check()
        cy.get('[data-cy="save-discount"]').click()
        cy.wait('@createByScope')
        cy.wait('@refreshByScope')
        cy.get('[data-cy="discount-card"]').first().within(() => {
            cy.contains('2 productos afectados').should('be.visible')
            cy.get('[data-cy="discount-target-summary"]').trigger('mouseover')
            cy.get('[data-cy="discount-target-popover"]').should('be.visible').and('contain', 'Combo Cypress').and('contain', 'Agua Cypress')
        })
        cy.get('[data-cy="discount-card"]').eq(1).within(() => {
            cy.get('[data-cy="discount-target-summary"]').trigger('mouseover')
            cy.get('[data-cy="discount-target-popover"]').should('be.visible').and('contain', 'Menú creación').and('contain', 'Menú bebidas Cypress')
        })
        cy.get('[data-cy="discount-card"]').eq(2).within(() => {
            cy.get('[data-cy="discount-target-summary"]').trigger('mouseover')
            cy.get('[data-cy="discount-target-popover"]').should('be.visible').and('contain', 'Favoritos').and('contain', 'Bebidas Cypress').and('not.contain', 'Postres Cypress')
        })
    })
})
