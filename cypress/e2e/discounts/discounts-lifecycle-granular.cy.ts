type LifecycleStatus = 'ACTIVE' | 'FINISHED' | 'DELETED'

const businessId = 'business-discounts-lifecycle-e2e'
const discountId = 'discount-lifecycle-e2e'
const slug = 'menu-descuentos-lifecycle-e2e'

const menu = {
    id: 'menu-lifecycle-e2e',
    businessId,
    name: 'Menú lifecycle Cypress',
    description: null,
    isActive: true,
    categories: [{
        id: 'category-lifecycle-e2e',
        businessId,
        menuId: 'menu-lifecycle-e2e',
        name: 'Categoría lifecycle Cypress',
        description: null,
        isActive: true,
        sortOrder: 0,
        products: [{ id: 'product-lifecycle-e2e', name: 'Producto lifecycle Cypress', categoryId: 'category-lifecycle-e2e', price: 200 }],
    }],
}

function discount(status: LifecycleStatus = 'ACTIVE') {
    return { id: discountId, name: 'Descuento lifecycle Cypress', type: 'PERCENT', value: 20, scope: 'PRODUCTS', status, endsAt: '2026-12-31T23:59:00.000Z', target_summary: '1 producto afectado', product_ids: ['product-lifecycle-e2e'] }
}

function installAdmin(state: { status: LifecycleStatus }) {
    cy.login()
    cy.intercept('GET', '**/businesses/mine', { statusCode: 200, body: { business: { id: businessId, name: 'Restaurante lifecycle Cypress' } } }).as('businessMine')
    cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [menu] } }).as('lifecycleMenus')
    cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: [discount(state.status)] } })).as('lifecycleDiscounts')
    cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/?$/ }, (request) => request.reply({ statusCode: 200, body: { discount: discount(state.status) } })).as('lifecycleDiscountDetail')
    cy.visit('/dashboard/discounts')
    cy.wait('@lifecycleMenus')
    cy.wait('@lifecycleDiscounts')
}

function lifecycleCard() {
    return cy.get(`[data-cy="discount-card"][data-discount-id="${discountId}"]`)
}

function publicCatalog(discounted: boolean) {
    const product = menu.categories[0].products[0]
    return {
        business: { id: businessId, name: 'Restaurante lifecycle Cypress', slug, description: null, logoUrl: null, logoBlurUrl: null, coverUrl: null, coverBlurUrl: null, ubication: 'Culiacán, Sinaloa', ubicationMaps: null, businessSchedule: null, whatsappNumber: '+526691234567' },
        menus: [{
            ...menu,
            categories: [{
                ...menu.categories[0],
                products: [{
                    ...product,
                    description: 'Producto para probar el ciclo de vida.',
                    imageUrl: null,
                    sortOrder: 0,
                    isAvailable: true,
                    optionGroups: [],
                    ...(discounted ? { priceOriginal: 200, priceFinal: 160, price_original: 200, price_final: 160, discount: { id: discountId, name: discount('ACTIVE').name, type: 'PERCENT', value: 20, label: '20% de descuento', endsAt: '2026-12-31T23:59:00.000Z' } } : {}),
                }],
            }],
        }],
    }
}

function openPublicWithoutDiscount() {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, { statusCode: 200, body: publicCatalog(false) }).as('lifecyclePublicCatalog')
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, { statusCode: 200, body: { discounts: [] } }).as('lifecyclePublicDiscounts')
    cy.visit(`/${slug}`)
    cy.wait('@lifecyclePublicCatalog')
    cy.wait('@lifecyclePublicDiscounts')
    cy.contains('Producto lifecycle Cypress').should('be.visible')
    cy.contains('article', 'Producto lifecycle Cypress').should('contain', '$200.00').and('not.contain', '20% de descuento')
}

describe('Descuentos · ciclo de vida e idempotencia', () => {
    it('finaliza un descuento, confirma FINISHED y lo conserva en el historial', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/end\/?$/ }, (request) => { state.status = 'FINISHED'; request.reply({ statusCode: 200, body: { ended: true, status: 'FINISHED' } }) }).as('finishDiscount')
        lifecycleCard().contains('Finalizar').click()
        cy.wait('@finishDiscount')
        lifecycleCard().should('contain', 'Finalizado')
        lifecycleCard().find('button').contains('Finalizar').should('not.exist')
        cy.contains('Cambios guardados correctamente').should('be.visible')
    })

    it('elimina lógicamente un descuento, confirma DELETED y no lo vuelve a borrar', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        let deleteCalls = 0
        cy.intercept({ method: 'DELETE', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/?$/ }, (request) => { deleteCalls += 1; state.status = 'DELETED'; request.reply({ statusCode: 204 }) }).as('deleteDiscount')
        cy.on('window:confirm', () => true)
        lifecycleCard().find('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deleteDiscount')
        lifecycleCard().should('contain', 'Eliminado')
        lifecycleCard().find('[aria-label="Eliminar descuento"]').should('be.disabled')
        cy.wrap(null).then(() => expect(deleteCalls).to.eq(1))
    })

    it('recupera un timeout de finalización sin repetir la operación que el backend ya procesó', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        let finishCalls = 0
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/end\/?$/ }, (request) => { finishCalls += 1; state.status = 'FINISHED'; request.reply({ statusCode: 504, body: { error: { code: 'TIMEOUT', message: 'Gateway timeout' } } }) }).as('finishTimeout')
        lifecycleCard().contains('Finalizar').click()
        cy.wait('@finishTimeout')
        cy.contains('Cambios guardados correctamente').should('be.visible')
        lifecycleCard().should('contain', 'Finalizado')
        cy.wrap(null).then(() => expect(finishCalls).to.eq(1))
    })

    it('recupera un timeout de eliminación sin crear duplicados ni perder el historial', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        let deleteCalls = 0
        cy.intercept({ method: 'DELETE', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/?$/ }, (request) => { deleteCalls += 1; state.status = 'DELETED'; request.reply({ statusCode: 504, body: { error: { code: 'TIMEOUT', message: 'Gateway timeout' } } }) }).as('deleteTimeout')
        cy.on('window:confirm', () => true)
        lifecycleCard().find('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deleteTimeout')
        cy.contains('Cambios guardados correctamente').should('be.visible')
        lifecycleCard().should('contain', 'Eliminado')
        cy.wrap(null).then(() => expect(deleteCalls).to.eq(1))
    })

    it('no reintenta errores 4xx y conserva el descuento activo si finalizar falla', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        let finishCalls = 0
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/end\/?$/ }, (request) => { finishCalls += 1; request.reply({ statusCode: 409, body: { error: { code: 'DISCOUNT_NOT_ACTIVE', message: 'The discount cannot be finished' } } }) }).as('finishConflict')
        lifecycleCard().contains('Finalizar').click()
        cy.wait('@finishConflict')
        lifecycleCard().should('contain', 'Activo')
        cy.contains('Cambios guardados correctamente').should('not.exist')
        cy.get('[role="status"]').should('be.visible')
        cy.wrap(null).then(() => expect(finishCalls).to.eq(1))
    })

    it('no muestra éxito si el backend responde pero no confirma FINISHED', () => {
        const state = { status: 'ACTIVE' as LifecycleStatus }
        installAdmin(state)
        let finishCalls = 0
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/discount-lifecycle-e2e\/end\/?$/ }, (request) => { finishCalls += 1; request.reply({ statusCode: 200, body: { ended: true, status: 'FINISHED' } }) }).as('finishWithoutConfirmation')
        lifecycleCard().contains('Finalizar').click()
        cy.wait('@finishWithoutConfirmation')
        cy.get('[role="status"]').should('be.visible').and('not.contain', 'Cambios guardados correctamente')
        lifecycleCard().should('contain', 'Activo')
        cy.contains('Cambios guardados correctamente').should('not.exist')
        cy.wrap(null).then(() => expect(finishCalls).to.eq(3))
    })

    it('no muestra descuentos FINISHED o DELETED en el menú público', () => {
        openPublicWithoutDiscount()
    })

    it('mantiene el menú visible si falla la consulta de descuentos y reintenta en segundo plano', () => {
        cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, { statusCode: 200, body: publicCatalog(false) }).as('publicCatalogBase')
        let attempts = 0
        cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, (request) => {
            attempts += 1
            if (attempts < 3) request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Temporary error' } } })
            else request.reply({ statusCode: 200, body: { discounts: [{ productId: 'product-lifecycle-e2e', priceOriginal: 200, priceFinal: 160, price_original: 200, price_final: 160, discount: { id: discountId, name: 'Descuento recuperado', type: 'PERCENT', value: 20, label: '20% de descuento', endsAt: '2026-12-31T23:59:00.000Z' } }] } })
        }).as('publicDiscountRetry')
        cy.visit(`/${slug}`)
        cy.wait('@publicCatalogBase')
        cy.contains('Producto lifecycle Cypress').should('be.visible')
        cy.wait('@publicDiscountRetry')
        cy.wait('@publicDiscountRetry')
        cy.wait('@publicDiscountRetry')
        cy.contains('article', 'Producto lifecycle Cypress').should('contain', '$160.00').and('contain', '$200.00').and('contain', '20% de descuento')
        cy.contains('Ocurrió un problema en Pedilo').should('not.exist')
    })
})

export {}
