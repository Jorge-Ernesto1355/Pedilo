const businessId = 'business-discounts-implementation-e2e'
const slug = 'menu-descuentos-implementation-e2e'

const menu = {
    id: 'menu-implementation-e2e',
    businessId,
    name: 'Menú completo Cypress',
    description: 'Menú para probar descuentos públicos.',
    isActive: true,
    categories: [
        {
            id: 'category-food-implementation-e2e',
            businessId,
            menuId: 'menu-implementation-e2e',
            name: 'Comidas Cypress',
            description: null,
            isActive: true,
            sortOrder: 0,
            products: [
                { id: 'product-burger-implementation-e2e', name: 'Hamburguesa Cypress', categoryId: 'category-food-implementation-e2e', price: 200 },
                { id: 'product-fries-implementation-e2e', name: 'Papas Cypress', categoryId: 'category-food-implementation-e2e', price: 80 },
            ],
        },
        {
            id: 'category-drinks-implementation-e2e',
            businessId,
            menuId: 'menu-implementation-e2e',
            name: 'Bebidas Cypress',
            description: null,
            isActive: true,
            sortOrder: 1,
            products: [
                { id: 'product-soda-implementation-e2e', name: 'Refresco Cypress', categoryId: 'category-drinks-implementation-e2e', price: 45 },
                { id: 'product-water-implementation-e2e', name: 'Agua Cypress', categoryId: 'category-drinks-implementation-e2e', price: 25 },
            ],
        },
    ],
}

function publicProduct(product: { id: string; name: string; price: number; categoryId: string }, discounted: boolean, config: { type: 'PERCENT' | 'FIXED'; value: number }) {
    const finalPrice = config.type === 'FIXED' ? Math.max(0, Math.round((product.price - config.value) * 100) / 100) : Math.round(product.price * (100 - config.value)) / 100
    const label = config.type === 'FIXED' ? `$${config.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de descuento` : `${config.value}% de descuento`
    return {
        ...product,
        businessId,
        description: `${product.name} para pruebas de descuentos.`,
        imageUrl: null,
        sortOrder: 0,
        isAvailable: true,
        optionGroups: [],
        ...(discounted ? {
            priceOriginal: product.price,
            priceFinal: finalPrice,
            discount: { id: 'discount-public-implementation-e2e', name: 'Descuento público Cypress', type: config.type, value: config.value, label, endsAt: '2026-12-31T23:59:00.000Z' },
        } : {}),
    }
}

function publicCatalog(discountedIds: string[], config: { type: 'PERCENT' | 'FIXED'; value: number }) {
    return {
        business: { id: businessId, name: 'Restaurante Cypress', slug, description: 'Catálogo de descuentos.', logoUrl: null, logoBlurUrl: null, coverUrl: null, coverBlurUrl: null, ubication: 'Culiacán, Sinaloa', ubicationMaps: null, businessSchedule: null, whatsappNumber: '+526691234567' },
        menus: [{ ...menu, categories: menu.categories.map((category) => ({ ...category, products: category.products.map((product) => publicProduct(product, discountedIds.includes(product.id), config)) })) }],
    }
}

function setupAdmin() {
    cy.login()
    cy.intercept('GET', '**/businesses/mine', { statusCode: 200, body: { business: { id: businessId, name: 'Restaurante Cypress' } } }).as('businessMine')
    cy.intercept('GET', '**/api/v1/businesses/mine/menus', { statusCode: 200, body: { menus: [menu] } }).as('menus')
    cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, { statusCode: 200, body: { discounts: [] } }).as('discounts')
    cy.visit('/dashboard/discounts')
    cy.wait('@menus')
    cy.wait('@discounts')
    openDiscountDialog()
}

function openDiscountDialog() {
    cy.document().then((document) => {
        if (!document.querySelector('[data-cy="discount-create-dialog"]')) {
            cy.get('[data-cy="create-discount"]').should('be.visible').and('not.be.disabled').click({ force: true })
        }
    })
    cy.get('[data-cy="discount-create-dialog"]').should('be.visible')
}

function createDiscount(scope: 'MENU' | 'CATEGORIES' | 'PRODUCTS', selectedNames: string[], expectedIds: string[], config: { type: 'PERCENT' | 'FIXED'; value: number } = { type: 'PERCENT', value: 20 }, onCreated?: (discount: Record<string, unknown>) => void) {
    cy.intercept({ method: 'POST', url: /\/businesses\/[^/]+\/discounts\/?$/ }, (request) => {
        expect(request.body.scope).to.eq(scope)
        expect(request.body.type).to.eq(config.type)
        expect(request.body.value).to.eq(config.value)
        const ids = scope === 'MENU' ? request.body.menuIds : scope === 'CATEGORIES' ? request.body.categoryIds : request.body.productIds
        expect(ids).to.deep.equal(expectedIds)
        const discount = { id: `discount-${scope.toLowerCase()}-implementation-e2e`, name: `Descuento ${scope}`, type: config.type, value: config.value, scope, status: 'ACTIVE', endsAt: '2026-12-31T23:59:00.000Z', target_summary: `${selectedNames.length} afectados`, product_ids: request.body.productIds, category_ids: request.body.categoryIds, menu_ids: request.body.menuIds }
        onCreated?.(discount)
        request.reply({ statusCode: 201, body: { discount } })
    }).as(`create${scope}`)
    cy.get('[data-cy="discount-create-dialog"]').should('be.visible')
    cy.get('[data-cy="discount-name"]').should('be.visible').clear().type(`Descuento ${scope}`)
    cy.get('[data-cy="discount-type"]').should('be.visible').select(config.type === 'FIXED' ? 'Monto fijo' : 'Porcentaje')
    cy.get('[data-cy="discount-value"]').should('be.visible').clear().type(String(config.value))
    cy.get('[data-cy="discount-scope"]').should('be.visible').select(scope === 'MENU' ? 'Todo el menú' : scope === 'CATEGORIES' ? 'Categorías' : 'Productos específicos')
    selectedNames.forEach((name) => cy.contains('label', name).find('input').check())
    cy.get('[data-cy="save-discount"]').click()
    cy.wait(`@create${scope}`)
    cy.contains('Descuento creado correctamente').should('be.visible')
}

function assertPublicDiscounts(discounted: Array<{ name: string; original: string; final: string }>, regular: Array<{ name: string; price: string }>, config: { type: 'PERCENT' | 'FIXED'; value: number } = { type: 'PERCENT', value: 20 }) {
    const label = config.type === 'FIXED' ? `$${config.value.toFixed(2)} de descuento` : `${config.value}% de descuento`
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, { statusCode: 200, body: publicCatalog(discounted.map((product) => menu.categories.flatMap((category) => category.products).find((item) => item.name === product.name)?.id ?? ''), config) }).as('publicCatalog')
    cy.visit(`/${slug}`)
    cy.wait('@publicCatalog')
    discounted.forEach((product) => cy.contains('article', product.name).should('contain', product.final).and('contain', product.original).and('contain', label))
    regular.forEach((product) => cy.contains('article', product.name).should('contain', product.price).and('not.contain', label))
}

function assertPublicDiscountFallback() {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, { statusCode: 200, body: publicCatalog([], { type: 'PERCENT', value: 20 }) }).as('publicCatalogBase')
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } } }).as('publicDiscountsFail')
    cy.visit(`/${slug}`)
    cy.wait('@publicCatalogBase')
    cy.contains('Hamburguesa Cypress').should('be.visible')
    cy.wait('@publicDiscountsFail')
    cy.contains('h1', 'Ocurrió un problema en Pedilo').should('not.exist')
    cy.contains('Internal server error').should('not.exist')
}

describe('Descuentos · implementación en menú público', () => {
    it('aplica el descuento únicamente a los productos seleccionados', () => {
        setupAdmin()
        createDiscount('PRODUCTS', ['Hamburguesa Cypress', 'Papas Cypress'], ['product-burger-implementation-e2e', 'product-fries-implementation-e2e'])
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$160.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$64.00' }],
            [{ name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
    })

    it('aplica el descuento a todos los productos de las categorías seleccionadas', () => {
        setupAdmin()
        createDiscount('CATEGORIES', ['Comidas Cypress'], ['category-food-implementation-e2e'])
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$160.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$64.00' }],
            [{ name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
    })

    it('aplica el descuento a todos los productos del menú seleccionado', () => {
        setupAdmin()
        createDiscount('MENU', ['Menú completo Cypress'], ['menu-implementation-e2e'])
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$160.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$64.00' }, { name: 'Refresco Cypress', original: '$45.00', final: '$36.00' }, { name: 'Agua Cypress', original: '$25.00', final: '$20.00' }],
            [],
        )
    })

    it('aplica correctamente un descuento de monto fijo en el menú público', () => {
        setupAdmin()
        createDiscount('PRODUCTS', ['Hamburguesa Cypress', 'Refresco Cypress'], ['product-burger-implementation-e2e', 'product-soda-implementation-e2e'], { type: 'FIXED', value: 35.5 })
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$164.50' }, { name: 'Refresco Cypress', original: '$45.00', final: '$9.50' }],
            [{ name: 'Papas Cypress', price: '$80.00' }, { name: 'Agua Cypress', price: '$25.00' }],
            { type: 'FIXED', value: 35.5 },
        )
    })

    it('prioriza el descuento más nuevo: producto 5%, categoría 10% y menú final 15%', () => {
        setupAdmin()
        createDiscount('PRODUCTS', ['Hamburguesa Cypress'], ['product-burger-implementation-e2e'], { type: 'PERCENT', value: 5 })
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$190.00' }],
            [{ name: 'Papas Cypress', price: '$80.00' }, { name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
            { type: 'PERCENT', value: 5 },
        )

        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@discounts')
        openDiscountDialog()
        createDiscount('CATEGORIES', ['Comidas Cypress'], ['category-food-implementation-e2e'], { type: 'PERCENT', value: 10 })
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$180.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$72.00' }],
            [{ name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
            { type: 'PERCENT', value: 10 },
        )

        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@discounts')
        openDiscountDialog()
        createDiscount('MENU', ['Menú completo Cypress'], ['menu-implementation-e2e'], { type: 'PERCENT', value: 15 })

        // El descuento del menú fue creado al final y debe reemplazar los anteriores
        // para todos los productos que viven dentro de ese menú.
        assertPublicDiscounts(
            [
                { name: 'Hamburguesa Cypress', original: '$200.00', final: '$170.00' },
                { name: 'Papas Cypress', original: '$80.00', final: '$68.00' },
                { name: 'Refresco Cypress', original: '$45.00', final: '$38.25' },
                { name: 'Agua Cypress', original: '$25.00', final: '$21.25' },
            ],
            [],
            { type: 'PERCENT', value: 15 },
        )
    })

    it('revierte al descuento anterior al eliminar primero el menú y después la categoría', () => {
        setupAdmin()
        const createdDiscounts: Array<Record<string, unknown>> = []
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: createdDiscounts } })).as('trackedDiscounts')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/?$/ }, (request) => { const id = request.url.split('/').filter(Boolean).pop(); const discount = createdDiscounts.find((item) => item.id === id); request.reply(discount ? { statusCode: 200, body: { discount } } : { statusCode: 404, body: { error: { code: 'DISCOUNT_NOT_FOUND' } } }) })
        cy.intercept({ method: 'DELETE', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/?$/ }, (request) => {
            const id = request.url.split('/').filter(Boolean).pop()
            const discount = createdDiscounts.find((item) => item.id === id)
            if (discount) discount.status = 'DELETED'
            request.reply({ statusCode: 204, body: null })
        }).as('deleteTrackedDiscount')

        createDiscount('PRODUCTS', ['Hamburguesa Cypress'], ['product-burger-implementation-e2e'], { type: 'PERCENT', value: 5 }, (discount) => createdDiscounts.unshift(discount))
        cy.wait('@trackedDiscounts')
        createDiscount('CATEGORIES', ['Comidas Cypress'], ['category-food-implementation-e2e'], { type: 'PERCENT', value: 10 }, (discount) => createdDiscounts.unshift(discount))
        cy.wait('@trackedDiscounts')
        createDiscount('MENU', ['Menú completo Cypress'], ['menu-implementation-e2e'], { type: 'PERCENT', value: 15 }, (discount) => createdDiscounts.unshift(discount))
        cy.wait('@trackedDiscounts')

        cy.on('window:confirm', () => true)
        cy.get('[data-cy="discount-card"]').first().should('have.attr', 'data-discount-id', 'discount-menu-implementation-e2e').find('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deleteTrackedDiscount')
        cy.wait('@trackedDiscounts')
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$180.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$72.00' }],
            [{ name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
            { type: 'PERCENT', value: 10 },
        )

        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@trackedDiscounts')
        cy.get('[data-cy="discount-card"][data-discount-id="discount-categories-implementation-e2e"]').find('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deleteTrackedDiscount')
        cy.wait('@trackedDiscounts')
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$190.00' }],
            [{ name: 'Papas Cypress', price: '$80.00' }, { name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
            { type: 'PERCENT', value: 5 },
        )
    })

    it('eliminar un descuento hace que desaparezca del menú público', () => {
        setupAdmin()
        const createdDiscounts: Array<Record<string, unknown>> = []
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: createdDiscounts } })).as('deleteDiscountList')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/?$/ }, (request) => { const id = request.url.split('/').filter(Boolean).pop(); const discount = createdDiscounts.find((item) => item.id === id); request.reply(discount ? { statusCode: 200, body: { discount } } : { statusCode: 404, body: { error: { code: 'DISCOUNT_NOT_FOUND' } } }) }).as('deletePublicDiscountDetail')
        cy.intercept({ method: 'DELETE', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/?$/ }, (request) => {
            if (createdDiscounts[0]) createdDiscounts[0].status = 'DELETED'
            request.reply({ statusCode: 204, body: null })
        }).as('deletePublicDiscount')
        createDiscount('PRODUCTS', ['Hamburguesa Cypress'], ['product-burger-implementation-e2e'], { type: 'PERCENT', value: 20 }, (discount) => createdDiscounts.unshift(discount))
        cy.wait('@deleteDiscountList')
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$160.00' }],
            [{ name: 'Papas Cypress', price: '$80.00' }, { name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@deleteDiscountList')
        cy.on('window:confirm', () => true)
        cy.get('[data-cy="discount-card"]').first().find('[aria-label="Eliminar descuento"]').click()
        cy.wait('@deletePublicDiscountDetail')
        cy.wait('@deletePublicDiscount')
        cy.wait('@deleteDiscountList')
        assertPublicDiscounts(
            [],
            [{ name: 'Hamburguesa Cypress', price: '$200.00' }, { name: 'Papas Cypress', price: '$80.00' }, { name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
    })

    it('finalizar un descuento hace que deje de aparecer en el menú público', () => {
        setupAdmin()
        const createdDiscounts: Array<Record<string, unknown>> = []
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/?(?:\?.*)?$/ }, (request) => request.reply({ statusCode: 200, body: { discounts: createdDiscounts } })).as('endDiscountList')
        cy.intercept({ method: 'GET', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/?$/ }, (request) => { const id = request.url.split('/').filter(Boolean).pop(); const discount = createdDiscounts.find((item) => item.id === id); request.reply(discount ? { statusCode: 200, body: { discount } } : { statusCode: 404, body: { error: { code: 'DISCOUNT_NOT_FOUND' } } }) })
        cy.intercept({ method: 'PATCH', url: /\/businesses\/[^/]+\/discounts\/[^/]+\/end\/?$/ }, (request) => {
            if (createdDiscounts[0]) createdDiscounts[0].status = 'FINISHED'
            request.reply({ statusCode: 200, body: { ended: true } })
        }).as('endPublicDiscount')
        createDiscount('CATEGORIES', ['Comidas Cypress'], ['category-food-implementation-e2e'], { type: 'PERCENT', value: 20 }, (discount) => createdDiscounts.unshift(discount))
        cy.wait('@endDiscountList')
        assertPublicDiscounts(
            [{ name: 'Hamburguesa Cypress', original: '$200.00', final: '$160.00' }, { name: 'Papas Cypress', original: '$80.00', final: '$64.00' }],
            [{ name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
        cy.visit('/dashboard/discounts')
        cy.wait('@menus')
        cy.wait('@endDiscountList')
        cy.get('[data-cy="discount-card"]').first().contains('Finalizar').click()
        cy.wait('@endPublicDiscount')
        cy.wait('@endDiscountList')
        assertPublicDiscounts(
            [],
            [{ name: 'Hamburguesa Cypress', price: '$200.00' }, { name: 'Papas Cypress', price: '$80.00' }, { name: 'Refresco Cypress', price: '$45.00' }, { name: 'Agua Cypress', price: '$25.00' }],
        )
    })

    it('muestra un error controlado si no carga el descuento aplicado a un producto', () => {
        setupAdmin()
        createDiscount('PRODUCTS', ['Hamburguesa Cypress'], ['product-burger-implementation-e2e'])
        assertPublicDiscountFallback()
    })

    it('muestra un error controlado si no carga el descuento aplicado a una categoría', () => {
        setupAdmin()
        createDiscount('CATEGORIES', ['Comidas Cypress'], ['category-food-implementation-e2e'])
        assertPublicDiscountFallback()
    })

    it('muestra un error controlado si no carga el descuento aplicado a un menú', () => {
        setupAdmin()
        createDiscount('MENU', ['Menú completo Cypress'], ['menu-implementation-e2e'])
        assertPublicDiscountFallback()
    })

    it('reintenta los descuentos en segundo plano y actualiza el precio sin recargar el menú', () => {
        setupAdmin()
        createDiscount('PRODUCTS', ['Hamburguesa Cypress'], ['product-burger-implementation-e2e'])
        cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, { statusCode: 200, body: publicCatalog([], { type: 'PERCENT', value: 20 }) }).as('publicCatalogBase')
        let attempts = 0
        cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, (request) => {
            attempts += 1
            if (attempts < 3) {
                request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Temporary discount failure' } } })
                return
            }
            request.reply({ statusCode: 200, body: { discounts: [{ productId: 'product-burger-implementation-e2e', priceOriginal: 200, priceFinal: 160, price_original: 200, price_final: 160, discount: { id: 'discount-retry-public-e2e', name: 'Descuento recuperado', type: 'PERCENT', value: 20, label: '20% de descuento', endsAt: '2026-12-31T23:59:00.000Z' } }] } })
        }).as('publicDiscountsRetry')
        cy.visit(`/${slug}`)
        cy.wait('@publicCatalogBase')
        cy.contains('Hamburguesa Cypress').should('be.visible')
        cy.wait('@publicDiscountsRetry')
        cy.wait('@publicDiscountsRetry')
        cy.wait('@publicDiscountsRetry')
        cy.contains('article', 'Hamburguesa Cypress').should('contain', '$160.00').and('contain', '$200.00').and('contain', '20% de descuento')
        cy.contains('h1', 'Ocurrió un problema en Pedilo').should('not.exist')
    })
})

export {}
