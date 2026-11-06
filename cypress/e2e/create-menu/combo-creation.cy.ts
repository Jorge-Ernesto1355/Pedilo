const businessId = 'business-combo-creation-e2e'
const menuId = 'menu-combo-creation-e2e'
const categoryId = 'category-combo-creation-e2e'
const comboId = 'combo-created-cypress-e2e'

const products = [
    { id: 'product-required-burger-e2e', name: 'Hamburguesa sencilla', price: 95 },
    { id: 'product-fries-e2e', name: 'Papas gajo', price: 45 },
    { id: 'product-wings-e2e', name: 'Alitas', price: 65 },
    { id: 'product-water-e2e', name: 'Agua de horchata', price: 30 },
    { id: 'product-soda-e2e', name: 'Refresco', price: 35 },
].map((item, sortOrder) => ({
    ...item,
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
    name: 'Menú combos Cypress',
    description: 'Menú para las pruebas de combos.',
    isActive: true,
    categories: [
        {
            id: categoryId,
            menuId,
            name: 'Combos',
            description: null,
            isActive: true,
            sortOrder: 0,
            products: [],
        },
    ],
}

function installComboCatalog() {
    const state: {
        products: Array<Record<string, unknown>>
        comboPayload: Record<string, unknown> | null
    } = {
        products,
        comboPayload: null,
    }
    let createAttempts = 0

    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: {
            business: {
                id: businessId,
                name: 'Restaurante Cypress',
                slug: 'restaurante-combos-cypress',
                description: 'Catálogo para pruebas.',
                ubication: 'Mazatlán, Sinaloa',
            },
        },
    })
    cy.intercept('GET', '**/businesses/mine/menus', {
        statusCode: 200,
        body: [menu],
    }).as('getMenus')
    cy.intercept('GET', `**/businesses/menus/${menuId}`, {
        statusCode: 200,
        body: menu,
    }).as('getMenu')
    cy.intercept('GET', '**/businesses/mine/products', (request) => {
        request.alias = 'getAllProducts'
        request.reply({ statusCode: 200, body: state.products })
    })
    cy.intercept('GET', `**/businesses/${businessId}/products*`, (request) => {
        request.alias = 'getProductsPage'
        request.reply({
            statusCode: 200,
            body: { products: state.products, page: 1, limit: 100, total: state.products.length },
        })
    })
    cy.intercept('GET', `**/businesses/${businessId}/products/stats`, {
        statusCode: 200,
        body: {
            totalProducts: products.length,
            activeProducts: products.length,
            inactiveProducts: 0,
            uncategorizedProducts: 0,
            categoriesWithProducts: 1,
        },
    })
    cy.intercept('GET', `**/businesses/${businessId}/products/analytics/best-selling*`, {
        statusCode: 200,
        body: [],
    })
    cy.intercept('GET', `**/businesses/${businessId}/products/analytics/most-requested*`, {
        statusCode: 200,
        body: [],
    })
    cy.intercept('GET', `**/businesses/${businessId}/products/analytics/summary*`, {
        statusCode: 200,
        body: {
            totalProducts: products.length,
            activeProducts: products.length,
            inactiveProducts: 0,
            uncategorizedProducts: 0,
            categoriesWithProducts: 1,
        },
    })
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: { currency: 'MXN' },
    })
    cy.intercept('GET', `**/businesses/categories/${categoryId}/products`, (request) => {
        request.alias = 'getCategoryProducts'
        request.reply({ statusCode: 200, body: state.products })
    })
    cy.intercept('GET', `**/businesses/products/${comboId}/combo-option-groups`, {
        statusCode: 200,
        body: {
            combo: {
                id: comboId,
                businessId,
                categoryId,
                name: 'Combo para compartir',
                description: 'Hamburguesa con acompañamiento y bebida a elegir.',
                price: 199,
                imageUrl: null,
                imageBlurUrl: null,
                isAvailable: true,
                active: true,
                type: 'COMBO',
                sortOrder: products.length,
                category: { id: categoryId, name: 'Combos', menuId },
                includedProducts: [
                    {
                        id: 'combo-included-burger-e2e',
                        productId: 'product-required-burger-e2e',
                        sortOrder: 0,
                        product: {
                            id: 'product-required-burger-e2e',
                            name: 'Hamburguesa sencilla',
                            price: 95,
                            imageUrl: null,
                            categoryId,
                            isAvailable: true,
                        },
                    },
                ],
                optionGroups: [],
            },
        },
    }).as('getComboDetails')
    cy.intercept('POST', '**/businesses/products/combos', (request) => {
        createAttempts += 1
        if (createAttempts === 1) {
            request.alias = 'createComboFailure'
            request.reply({
                statusCode: 503,
                delay: 200,
                body: { error: { code: 'INTERNAL_ERROR' } },
            })
            return
        }

        request.alias = 'createCombo'
        state.comboPayload = request.body as Record<string, unknown>
        expect(state.comboPayload).to.deep.equal({
            categoryId,
            name: 'Combo para compartir',
            description: 'Hamburguesa con acompañamiento y bebida a elegir.',
            price: 199,
            includedProductIds: ['product-required-burger-e2e'],
            includedProducts: [{ productId: 'product-required-burger-e2e', quantity: 1 }],
            optionGroups: [
                {
                    name: 'Acompañamiento',
                    productIds: ['product-fries-e2e', 'product-wings-e2e'],
                    minSelections: 1,
                    maxSelections: 1,
                },
                {
                    name: 'Bebida',
                    productIds: ['product-water-e2e', 'product-soda-e2e'],
                    minSelections: 1,
                    maxSelections: 1,
                },
            ],
        })

        const createdCombo = {
            id: comboId,
            businessId,
            categoryId,
            name: 'Combo para compartir',
            description: 'Hamburguesa con acompañamiento y bebida a elegir.',
            price: 199,
            imageUrl: null,
            imageBlurUrl: null,
            isAvailable: true,
            active: true,
            type: 'COMBO',
            sortOrder: state.products.length,
            optionGroups: state.comboPayload.optionGroups,
            includedProducts: state.comboPayload.includedProductIds,
            category: { id: categoryId, name: 'Combos', menuId },
        }
        state.products = [...state.products, createdCombo]
        request.reply({ statusCode: 201, body: { combo: createdCombo } })
    })

    return state
}

function comboDialog() {
    return cy.get('[data-testid="combo-creation-dialog"]')
}

describe('Creación de combos desde el menú', () => {
    it('valida productos, crea grupos con alternativas y guarda la estructura completa', () => {
        const state = installComboCatalog()
        cy.login()
        cy.visit('/create-menu')
        cy.wait('@getMenus')
        cy.contains('button', menu.name).click()
        cy.wait('@getMenu')
        cy.contains('button', 'Agregar producto').click()

        cy.get('[data-testid="product-type-dialog"]')
            .should('be.visible')
            .contains('button', 'Combo')
            .click()
        cy.get('[data-testid="product-type-dialog"]')
            .contains('button', 'Continuar con combo')
            .click()
        cy.get('[data-testid="product-type-dialog"]').should('not.exist')
        comboDialog().should('be.visible').find('h2').should('have.text', 'Crear un combo')

        comboDialog()
            .should('contain', 'Crear un combo')
            .within(() => {
                cy.contains('Obligatorios: nombre, precio y categoría').should('be.visible')
                cy.contains('Nombre del combo').should('contain', '*')
                cy.contains('label', 'Descripción').should('contain', '(opcional)')
                cy.contains('label', 'Imagen del combo').should('contain', '(opcional)')
                cy.contains('button', 'Continuar').should('be.disabled')

                cy.get('input[placeholder="Nombre del combo"]')
                    .should('have.attr', 'maxlength', '80')
                    .type('x'.repeat(90))
                    .should('have.value', 'x'.repeat(80))
                    .clear()
                    .type('Combo para compartir')
                cy.get('textarea[placeholder="Describe brevemente qué ofrece este combo"]')
                    .should('have.attr', 'maxlength', '100')
                    .type('x'.repeat(110))
                    .should('have.value', 'x'.repeat(100))
                    .clear()
                    .type('Hamburguesa con acompañamiento y bebida a elegir.')
                cy.contains('label', 'Precio')
                    .find('input')
                    .should('have.attr', 'max', '10000000')
                    .and('have.attr', 'step', '0.01')
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains('label', 'Precio').find('input').type('10000001')
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains('label', 'Precio').find('input').clear().type('0')
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains('label', 'Precio').find('input').clear().type('199.999')
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains('label', 'Precio').find('input').clear().type('199')
                cy.get('textarea[placeholder="Describe brevemente qué ofrece este combo"]').clear()
                cy.contains('button', 'Continuar').should('not.be.disabled')
                cy.get('textarea[placeholder="Describe brevemente qué ofrece este combo"]').type(
                    'Hamburguesa con acompañamiento y bebida a elegir.',
                )
                cy.contains('button', 'Continuar').click()
            })

        comboDialog()
            .should('contain', 'Productos incluidos')
            .within(() => {
                cy.contains('button', 'Continuar').should('be.disabled')
                cy.contains('button', 'Hamburguesa sencilla').click()
                cy.contains('button', 'Continuar').should('not.be.disabled').click()
            })

        comboDialog()
            .should('contain', 'Opciones para el cliente')
            .within(() => {
                cy.contains('button', 'Agregar grupo al combo').should('be.disabled')
                cy.contains('button', 'Hamburguesa sencilla').should('be.disabled')
                cy.contains('button', 'Papas gajo').click()
                cy.contains('button', 'Agregar grupo al combo').should('be.disabled')
                cy.contains('button', 'Continuar').click()
                cy.contains('h3', 'Opciones para el cliente').should('be.visible')
                cy.get('input[aria-label="Nombre del grupo"]').should('have.value', '')
                cy.contains('button', 'Alitas').click()
                cy.contains('button', 'Agregar grupo al combo').should('be.disabled')
                cy.contains('button', 'Continuar').click()
                cy.contains('h3', 'Opciones para el cliente').should('be.visible')
                cy.get('[data-testid="combo-create-error"]').should(
                    'contain',
                    'Completa el grupo de opciones',
                )
                cy.contains('button', 'Descartar grupo incompleto').click()
                cy.contains('button', 'Continuar').click()
                cy.contains('h3', 'Revisa tu combo').should('be.visible')
                cy.contains('Sin grupos de opciones.').should('be.visible')
                cy.contains('button', 'Anterior').click()
                cy.contains('button', 'Papas gajo').click()
                cy.contains('button', 'Alitas').click()
                cy.contains('button', 'Agregar grupo al combo').should('be.disabled')
                cy.get('input[aria-label="Nombre del grupo"]')
                    .should('have.attr', 'maxlength', '30')
                    .type('x'.repeat(35))
                    .should('have.value', 'x'.repeat(30))
                    .clear()
                    .type('Acompañamiento')
                cy.contains('button', 'Agregar grupo al combo').should('be.enabled')
                cy.contains('button', 'Alitas').click()
                cy.contains('button', 'Agregar grupo al combo').should('be.disabled')
                cy.contains('button', 'Alitas').click()
                cy.contains('button', 'Agregar grupo al combo').should('be.enabled')
                cy.contains('button', 'Agregar grupo al combo').click()
                cy.contains('Acompañamiento').should('be.visible')
                cy.contains('Papas gajo, Alitas').should('be.visible')

                cy.get('input[aria-label="Nombre del grupo"]').type('Bebida')
                cy.contains('button', 'Papas gajo').should('be.disabled')
                cy.contains('button', 'Agua de horchata').click()
                cy.contains('button', 'Refresco').click()
                cy.contains('button', 'Agregar grupo al combo').click()
                cy.contains('Bebida').should('be.visible')
                cy.contains('Agua de horchata, Refresco').should('be.visible')
                cy.contains('button', 'Continuar').click()
            })
        cy.contains('Grupo agregado').should('be.visible')

        comboDialog()
            .should('contain', 'Revisa tu combo')
            .and('contain', 'Hamburguesa sencilla')
            .and('contain', 'Acompañamiento')
            .and('contain', 'Bebida')
            .and('contain', 'El cliente elige una opción.')
            .within(() => cy.contains('button', 'Crear combo').click())

        cy.contains('button', 'Creando combo…').should('be.disabled')
        cy.wait('@createComboFailure')
        comboDialog()
            .find('[data-testid="combo-create-error"]')
            .should('be.visible')
            .and('contain', 'Ocurrió un problema en Pedilo')
            .and('contain', 'Inténtalo nuevamente en unos momentos.')
        comboDialog().should('contain', 'Revisa tu combo').and('contain', 'Combo para compartir')
        cy.get('[data-testid="combo-create-error"]').contains('button', 'Intentar de nuevo').click()

        cy.wait('@createCombo')
        cy.then(() => {
            expect(state.comboPayload).not.to.equal(null)
            expect(state.products.some((item) => item.id === comboId)).to.eq(true)
        })
        cy.contains('Combo creado').should('be.visible')
        cy.get('[data-testid="combo-creation-dialog"]').should('not.exist')
        cy.contains('Combo para compartir').should('be.visible')
        cy.contains('COMBO').should('be.visible')
        cy.get('button[aria-label="Editar Combo para compartir"]').click()
        cy.wait('@getComboDetails')
        cy.get('[data-testid="combo-settings-dialog"]')
            .should('be.visible')
            .find('h2')
            .should('have.text', 'Administrar Combo para compartir')
        cy.get('[data-testid="combo-creation-dialog"]').should('not.exist')

        cy.get('[data-testid="combo-settings-dialog"]').find('button[aria-label="Cerrar"]').click()
        cy.visit('/dashboard/products')
        cy.get('button[aria-label="Editar Combo para compartir"]').click()
        cy.wait('@getComboDetails')
        cy.get('[data-testid="combo-settings-dialog"]')
            .should('be.visible')
            .find('h2')
            .should('have.text', 'Administrar Combo para compartir')
        cy.contains('h2', 'Editar producto').should('not.exist')
    })
})

export {}
