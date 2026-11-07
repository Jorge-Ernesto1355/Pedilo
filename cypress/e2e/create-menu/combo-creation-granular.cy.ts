const businessId = 'business-combo-granular-e2e'
const menuId = 'menu-combo-granular-e2e'
const categoryId = 'category-combo-granular-e2e'

const products = [
    ['required-burger-granular', 'Hamburguesa sencilla', 95],
    ['fries-granular', 'Papas gajo', 45],
    ['wings-granular', 'Alitas', 65],
    ['water-granular', 'Agua de horchata', 30],
    ['soda-granular', 'Refresco', 35],
    ['option-1-granular', 'Opción 1', 20],
    ['option-2-granular', 'Opción 2', 21],
    ['option-3-granular', 'Opción 3', 22],
    ['option-4-granular', 'Opción 4', 23],
    ['option-5-granular', 'Opción 5', 24],
    ['option-6-granular', 'Opción 6', 25],
    ['option-7-granular', 'Opción 7', 26],
    ['option-8-granular', 'Opción 8', 27],
].map(([id, name, price], sortOrder) => ({
    id: `product-${id}`,
    name,
    price,
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
    name: 'Menú combos granulares',
    description: null,
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

function dialog() {
    return cy.get('[data-testid="combo-creation-dialog"]')
}

function installCatalog(options: { productsDelay?: number; productsError?: boolean; createError?: boolean } = {}) {
    const state = { createAttempts: 0 }
    const reply = (request: CyHttpMessages.IncomingHttpRequest) => {
        request.alias = 'getAllProducts'
        request.reply({
            statusCode: options.productsError ? 500 : 200,
            delay: options.productsDelay ?? 0,
            body: options.productsError ? { error: { code: 'INTERNAL_ERROR' } } : products,
        })
    }

    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: { business: { id: businessId, name: 'Restaurante granular', slug: 'combos-granulares' } },
    })
    cy.intercept('GET', '**/businesses/mine/menus', { statusCode: 200, body: [menu] }).as('getMenus')
    cy.intercept('GET', `**/businesses/menus/${menuId}`, { statusCode: 200, body: menu }).as('getMenu')
    cy.intercept('GET', '**/businesses/mine/products', reply)
    cy.intercept('GET', `**/businesses/${businessId}/products*`, (request) => {
        request.alias = 'getProductsPage'
        request.reply({ statusCode: options.productsError ? 500 : 200, body: { products, page: 1, limit: 100, total: products.length } })
    })
    cy.intercept('GET', `**/businesses/${businessId}/products/stats`, { statusCode: 200, body: { totalProducts: products.length, activeProducts: products.length, inactiveProducts: 0, uncategorizedProducts: 0, categoriesWithProducts: 1 } })
    cy.intercept('GET', `**/businesses/${businessId}/products/analytics/**`, { statusCode: 200, body: [] })
    cy.intercept('GET', '**/businesses/settings', { statusCode: 200, body: { currency: 'MXN' } })
    cy.intercept('GET', `**/businesses/categories/${categoryId}/products`, { statusCode: 200, body: products })
    cy.intercept('POST', '**/businesses/products/combos', (request) => {
        state.createAttempts += 1
        request.alias = state.createAttempts === 1 && options.createError ? 'createComboFailure' : 'createCombo'
        if (state.createAttempts === 1 && options.createError) {
            request.reply({
                statusCode: 503,
                delay: 500,
                body: { error: { code: 'INTERNAL_ERROR' } },
            })
            return
        }
        request.reply({
            statusCode: 201,
            body: {
                combo: {
                    id: 'combo-granular-created',
                    businessId,
                    categoryId,
                    name: request.body.name,
                    description: request.body.description,
                    price: request.body.price,
                    type: 'COMBO',
                    isAvailable: true,
                    optionGroups: request.body.optionGroups,
                    includedProducts: request.body.includedProductIds,
                    category: { id: categoryId, name: 'Combos', menuId },
                },
            },
        })
    })
    return state
}

function openCreation() {
    cy.login()
    cy.visit('/create-menu')
    cy.wait('@getMenus')
    cy.contains('button', menu.name).click()
    cy.wait('@getMenu')
    cy.contains('button', 'Agregar producto').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Combo').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Continuar con combo').click()
    dialog().should('be.visible')
}

function fillValidBasics() {
    dialog().find('input[placeholder="Nombre del combo"]').type('Combo granular')
    dialog().contains('label', 'Precio').find('input').type('199')
}

function goToIncluded() {
    fillValidBasics()
    dialog().contains('button', 'Continuar').click()
    dialog().contains('h3', 'Productos incluidos').should('be.visible')
}

function goToOptionsWithIncluded() {
    goToIncluded()
    dialog().contains('button', 'Hamburguesa sencilla').click()
    dialog().contains('button', 'Continuar').click()
    dialog().contains('h3', 'Opciones para el cliente').should('be.visible')
}

describe('Creación granular de combos', () => {
    it('deshabilita Continuar cuando faltan los datos obligatorios', () => {
        installCatalog()
        openCreation()
        dialog().contains('button', 'Continuar').should('be.disabled')
    })

    it('limita el nombre a 80 caracteres', () => {
        installCatalog()
        openCreation()
        dialog().find('input[placeholder="Nombre del combo"]').type('x'.repeat(100)).should('have.value', 'x'.repeat(80))
    })

    it('permite seleccionar una imagen del combo y la envía como multipart al crearlo', () => {
        installCatalog()
        openCreation()
        fillValidBasics()
        dialog().find('input[type="file"]').selectFile('public/logoPediloSinfondo.png', { force: true })
        dialog().find('img[alt="Vista previa del combo"]').should('be.visible')
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Hamburguesa sencilla').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Crear combo').click()
        cy.wait('@createCombo').its('request.headers.content-type').should('contain', 'multipart/form-data')
    })

    it('mantiene dentro del modal la revisión con nombre, descripción y precio máximos', () => {
        installCatalog()
        openCreation()
        dialog().find('input[placeholder="Nombre del combo"]').type('x'.repeat(80))
        dialog().find('textarea[placeholder="Describe brevemente qué ofrece este combo"]').type('d'.repeat(100))
        dialog().contains('label', 'Precio').find('input').type('10000000')
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Hamburguesa sencilla').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('h3', 'Revisa tu combo').should('be.visible')
        dialog().then(($dialog) => {
            expect($dialog[0]!.scrollWidth).to.be.lte($dialog[0]!.clientWidth)
        })
    })

    it('mantiene Continuar deshabilitado con precio cero', () => {
        installCatalog()
        openCreation()
        dialog().find('input[placeholder="Nombre del combo"]').type('Combo')
        dialog().contains('label', 'Precio').find('input').type('0')
        dialog().contains('button', 'Continuar').should('be.disabled')
    })

    it('mantiene Continuar deshabilitado con más de dos decimales', () => {
        installCatalog()
        openCreation()
        dialog().find('input[placeholder="Nombre del combo"]').type('Combo')
        dialog().contains('label', 'Precio').find('input').type('199.999')
        dialog().contains('button', 'Continuar').should('be.disabled')
    })

    it('limita el precio al máximo permitido', () => {
        installCatalog()
        openCreation()
        dialog().contains('label', 'Precio').find('input').should('have.attr', 'max', '10000000')
    })

    it('muestra loading al cargar productos incluidos', () => {
        installCatalog({ productsDelay: 2500 })
        openCreation()
        goToIncluded()
        dialog().find('[role="status"]').should('contain', 'Cargando productos')
        cy.wait('@getAllProducts')
    })

    it('muestra error cuando falla la carga de productos', () => {
        installCatalog({ productsError: true })
        openCreation()
        goToIncluded()
        dialog().find('[role="alert"]').should('contain', 'No pudimos cargar los productos')
    })

    it('mantiene Continuar deshabilitado sin productos incluidos', () => {
        installCatalog()
        openCreation()
        goToIncluded()
        dialog().contains('button', 'Continuar').should('be.disabled')
    })

    it('habilita Continuar al seleccionar un producto incluido', () => {
        installCatalog()
        openCreation()
        goToIncluded()
        dialog().contains('button', 'Hamburguesa sencilla').click()
        dialog().contains('button', 'Continuar').should('not.be.disabled')
    })

    it('crea un combo con cantidades independientes por producto', () => {
        installCatalog()
        openCreation()
        goToIncluded()
        dialog().contains('button', 'Hamburguesa sencilla').click()
        dialog().contains('button', 'Papas gajo').click()
        dialog().find('[aria-label="Aumentar cantidad de Hamburguesa sencilla"]').click().click()
        dialog().find('[aria-label="Aumentar cantidad de Papas gajo"]').click().click().click().click()
        dialog().find('[data-testid="combo-included-quantity-product-required-burger-granular"]').should('contain', '3')
        dialog().find('[data-testid="combo-included-quantity-product-fries-granular"]').should('contain', '5')
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Crear combo').click()
        cy.wait('@createCombo').its('request.body.includedProducts').should('deep.equal', [
            { productId: 'product-required-burger-granular', quantity: 3 },
            { productId: 'product-fries-granular', quantity: 5 },
        ])
    })

    it('permite como máximo diez productos obligatorios y avisa al intentar agregar el número once', () => {
        installCatalog()
        openCreation()
        goToIncluded()

        products.slice(0, 10).forEach((product) => {
            dialog().contains('button', product.name).click()
        })

        dialog().contains('10/10 productos seleccionados').should('be.visible')
        dialog().contains('button', products[10]!.name).click()
        dialog().find('[data-testid="combo-create-error"]').should('contain', 'hasta 10 productos obligatorios')
        dialog().contains('10/10 productos seleccionados').should('be.visible')
    })

    it('impide reutilizar un producto incluido dentro de un grupo', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Hamburguesa sencilla').should('be.disabled')
    })

    it('deshabilita Agregar grupo sin nombre ni dos productos', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Agregar grupo al combo').should('be.disabled')
    })

    it('deshabilita Agregar grupo cuando solo hay un producto', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Agregar grupo al combo').should('be.disabled')
    })

    it('permite como máximo cinco opciones por grupo y avisa al intentar agregar la sexta', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()

        products.slice(1, 6).forEach((product) => {
            dialog().contains('button', product.name).click()
        })
        dialog().find('input[aria-label="Nombre del grupo"]').type('Opciones limitadas')
        dialog().contains('5 productos por grupo').should('be.visible')
        dialog().contains('button', products[6]!.name).click()
        dialog().find('[data-testid="combo-create-error"]').should('contain', 'hasta 5 productos')
    })

    it('habilita Agregar grupo con nombre y dos productos distintos', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().contains('button', 'Alitas').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Agregar grupo al combo').should('not.be.disabled')
    })

    it('muestra un error al intentar avanzar con un grupo incompleto', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Continuar').click()
        dialog().find('[data-testid="combo-create-error"]').should('contain', 'Completa el grupo de opciones')
    })

    it('permite descartar un grupo incompleto', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Descartar grupo incompleto').click()
        dialog().find('input[aria-label="Nombre del grupo"]').should('have.value', '')
        dialog().contains('button', 'Continuar').click()
        dialog().contains('h3', 'Revisa tu combo').should('be.visible')
    })

    it('agrega un grupo y lo muestra en la revisión', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().contains('button', 'Alitas').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Agregar grupo al combo').click()
        dialog().contains('Acompañamiento').should('be.visible')
        dialog().contains('Papas gajo, Alitas').should('be.visible')
    })

    it('permite crear como máximo cinco grupos de opciones y avisa al alcanzar el límite', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()

        Array.from({ length: 5 }, (_, index) => {
            const firstProduct = products[index * 2 + 1]!
            const secondProduct = products[index * 2 + 2]!
            dialog().contains('button', firstProduct.name).click()
            dialog().contains('button', secondProduct.name).click()
            dialog().find('input[aria-label="Nombre del grupo"]').type(`Grupo ${index + 1}`)
            dialog().contains('button', 'Agregar grupo al combo').click()
        })

        dialog().contains('5/5 grupos agregados').should('be.visible')
        dialog().contains('button', products[11]!.name).click()
        dialog().contains('button', products[12]!.name).click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Grupo 6')
        dialog().find('[role="alert"]').should('contain', 'límite de 5 grupos')
        dialog().contains('button', 'Agregar grupo al combo').should('be.disabled')
    })

    it('elimina un grupo antes de crear el combo', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().contains('button', 'Alitas').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Agregar grupo al combo').click()
        dialog().find('button[aria-label="Quitar grupo Acompañamiento"]').click()
        dialog().contains('button[aria-label="Quitar grupo Acompañamiento"]').should('not.exist')
    })

    it('muestra loading y permite reintentar después de un error de creación', () => {
        const state = installCatalog({ createError: true })
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('h3', 'Revisa tu combo').should('be.visible')
        dialog().contains('button', 'Crear combo').click()
        dialog().contains('button', 'Creando combo…').should('be.disabled')
        cy.wait('@createComboFailure')
        dialog().find('[data-testid="combo-create-error"]').should('be.visible')
        dialog().contains('button', 'Intentar de nuevo').click()
        cy.wait('@createCombo')
        cy.then(() => expect(state.createAttempts).to.eq(2))
    })

    it('envía exactamente incluidos, grupos y datos del combo', () => {
        installCatalog()
        openCreation()
        goToOptionsWithIncluded()
        dialog().contains('button', 'Papas gajo').click()
        dialog().contains('button', 'Alitas').click()
        dialog().find('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
        dialog().contains('button', 'Agregar grupo al combo').click()
        dialog().contains('button', 'Continuar').click()
        dialog().contains('button', 'Crear combo').click()
        cy.wait('@createCombo').its('request.body').should('deep.equal', {
            categoryId,
            name: 'Combo granular',
            description: '',
            price: 199,
            includedProductIds: ['product-required-burger-granular'],
            includedProducts: [{ productId: 'product-required-burger-granular', quantity: 1 }],
            optionGroups: [{
                name: 'Acompañamiento',
                productIds: ['product-fries-granular', 'product-wings-granular'],
                minSelections: 1,
                maxSelections: 1,
            }],
        })
    })
})

export {}
import type { CyHttpMessages } from 'cypress/types/net-stubbing'

