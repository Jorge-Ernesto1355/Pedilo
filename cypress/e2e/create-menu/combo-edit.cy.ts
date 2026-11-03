const businessId = 'business-combo-edit-e2e'
const menuId = 'menu-combo-edit-e2e'
const categoryId = 'category-combo-edit-e2e'
const comboId = 'combo-edit-e2e'

const catalogProducts = [
    ['required-burger', 'Hamburguesa', 90],
    ['fries', 'Papas gajo', 40],
    ['wings', 'Alitas', 65],
    ['water', 'Agua fresca', 25],
    ['soda', 'Refresco', 30],
    ['lemonade', 'Limonada', 28],
    ['iced-tea', 'Té helado', 32],
    ['extra-1', 'Producto extra 1', 20],
    ['extra-2', 'Producto extra 2', 21],
    ['extra-3', 'Producto extra 3', 22],
    ['extra-4', 'Producto extra 4', 23],
].map(([id, name, price], sortOrder) => ({
    id: `edit-${id}`,
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
    name: 'Menú de edición de combos',
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

function productRecord(id: string) {
    return catalogProducts.find((product) => product.id === id)!
}

function comboGroupIdFromUrl(url: string) {
    return new URL(url).pathname.match(/combo-option-groups\/([^/]+)/)?.[1]
}

function comboGroupProductIdsFromUrl(url: string) {
    const match = new URL(url).pathname.match(/combo-option-groups\/([^/]+)\/products\/([^/]+)/)
    return { groupId: match?.[1], productId: match?.[2] }
}

function installCatalog(options: { detailsDelay?: number; detailsError?: boolean; updateDelay?: number; updateError?: boolean } = {}) {
    const combo = {
        id: comboId,
        businessId,
        categoryId,
        name: 'Combo de la casa',
        description: 'Incluye hamburguesa y acompañamiento.',
        price: 180,
        imageUrl: null,
        imageBlurUrl: null,
        isAvailable: true,
        active: true,
        type: 'COMBO',
        sortOrder: 0,
        category: { id: categoryId, name: 'Combos', menuId },
        includedProducts: [
            {
                id: 'included-burger',
                productId: 'edit-required-burger',
                sortOrder: 0,
                product: productRecord('edit-required-burger'),
            },
        ],
        optionGroups: [
            {
                id: 'group-sides',
                comboProductId: comboId,
                businessId,
                name: 'Acompañamiento',
                minSelections: 1,
                maxSelections: 1,
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                productIds: ['edit-fries', 'edit-wings'],
                products: ['edit-fries', 'edit-wings'].map((productId, sortOrder) => ({
                    id: `choice-${productId}`,
                    productId,
                    sortOrder,
                    product: productRecord(productId),
                })),
            },
        ],
    }
    const comboProduct = {
        ...combo,
        optionGroups: [],
        includedProducts: [],
        category: undefined,
    }

    function comboResponse() {
        return {
            ...combo,
            includedProducts: combo.includedProducts ?? [],
            optionGroups: combo.optionGroups.map((group) => ({
                ...group,
                productIds: group.productIds ?? [],
                products: group.products ?? [],
            })),
        }
    }

    cy.intercept('GET', '**/businesses/mine', {
        statusCode: 200,
        body: {
            business: { id: businessId, name: 'Restaurante de prueba', slug: 'combos-edicion' },
        },
    })
    cy.intercept('GET', '**/businesses/mine/menus', { statusCode: 200, body: [menu] })
    cy.intercept('GET', '**/businesses/mine/products', {
        statusCode: 200,
        body: [...catalogProducts, comboProduct],
    })
    cy.intercept('GET', `**/businesses/${businessId}/products*`, (request) => {
        const path = new URL(request.url).pathname
        if (path.endsWith('/stats')) {
            request.reply({
                statusCode: 200,
                body: {
                    totalProducts: 8,
                    activeProducts: 8,
                    inactiveProducts: 0,
                    uncategorizedProducts: 0,
                    categoriesWithProducts: 1,
                },
            })
            return
        }
        if (path.includes('/analytics/')) {
            request.reply(
                path.endsWith('/analytics/summary')
                    ? {
                          statusCode: 200,
                          body: {
                              totalProducts: 8,
                              activeProducts: 8,
                              inactiveProducts: 0,
                              uncategorizedProducts: 0,
                              categoriesWithProducts: 1,
                              topSellingProducts: [],
                              mostRequestedProducts: [],
                          },
                      }
                    : { statusCode: 200, body: [] },
            )
            return
        }
        request.reply({
            statusCode: 200,
            body: { products: [...catalogProducts, comboProduct], page: 1, limit: 10, total: 8 },
        })
    })
    cy.intercept('GET', '**/businesses/settings', { statusCode: 200, body: { currency: 'MXN' } })
    cy.intercept('GET', `**/businesses/products/${comboId}/combo-option-groups`, (request) => {
        request.reply({
            statusCode: options.detailsError ? 404 : 200,
            delay: options.detailsDelay,
            body: options.detailsError
                ? { error: { code: 'COMBO_PRODUCT_NOT_FOUND' } }
                : { combo: comboResponse() },
        })
    }).as('comboDetails')
    cy.intercept('PATCH', `**/businesses/products/${comboId}`, (request) => {
        if (options.updateError) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
            return
        }
        Object.assign(combo, request.body)
        request.reply({ statusCode: 200, delay: options.updateDelay, body: { product: combo } })
    }).as('updateCombo')
    cy.intercept('POST', `**/businesses/products/${comboId}/combo-included-products`, (request) => {
        const product = productRecord(request.body.productId)
        const included = {
            id: `included-${product.id}`,
            productId: product.id,
            sortOrder: combo.includedProducts.length,
            product,
        }
        combo.includedProducts.push(included)
        request.reply({ statusCode: 201, body: { includedProduct: included } })
    }).as('addIncluded')
    cy.intercept(
        'DELETE',
        `**/businesses/products/${comboId}/combo-included-products/*`,
        (request) => {
            const includedId = request.url.split('/').pop()
            combo.includedProducts = combo.includedProducts.filter((item) => item.id !== includedId)
            request.reply({ statusCode: 204, body: '' })
        },
    ).as('removeIncluded')
    cy.intercept('POST', `**/businesses/products/${comboId}/combo-option-groups`, (request) => {
        const group = {
            id: `group-${String(request.body.name).toLowerCase().replaceAll(' ', '-')}`,
            comboProductId: comboId,
            businessId,
            name: request.body.name,
            minSelections: request.body.minSelections,
            maxSelections: request.body.maxSelections,
            sortOrder: combo.optionGroups.length,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            productIds: [...request.body.productIds],
            products: request.body.productIds.map((productId: string, sortOrder: number) => ({
                id: `choice-${productId}`,
                productId,
                sortOrder,
                product: productRecord(productId),
            })),
        }
        combo.optionGroups.push(group)
        request.reply({ statusCode: 201, body: { group } })
    }).as('createOptionGroup')
    cy.intercept('PATCH', `**/businesses/products/${comboId}/combo-option-groups/*`, (request) => {
        const groupId = comboGroupIdFromUrl(request.url)
        const group = combo.optionGroups.find((item) => item.id === groupId)
        if (!group) {
            request.reply({ statusCode: 500, body: { error: { code: 'TEST_GROUP_NOT_FOUND' } } })
            return
        }
        Object.assign(group, request.body)
        request.reply({ statusCode: 200, body: { group } })
    }).as('updateOptionGroup')
    cy.intercept(
        'POST',
        `**/businesses/products/${comboId}/combo-option-groups/*/products`,
        (request) => {
            const groupId = comboGroupIdFromUrl(request.url)
            const group = combo.optionGroups.find((item) => item.id === groupId)
            if (!group) {
                request.reply({ statusCode: 500, body: { error: { code: 'TEST_GROUP_NOT_FOUND' } } })
                return
            }
            const product = productRecord(request.body.productId)
            const choice = {
                id: `choice-${product.id}`,
                productId: product.id,
                sortOrder: (group.products ?? []).length,
                product,
            }
            group.products = [...(group.products ?? []), choice]
            request.reply({ statusCode: 201, body: { option: choice } })
        },
    ).as('addOption')
    cy.intercept(
        'DELETE',
        `**/businesses/products/${comboId}/combo-option-groups/*/products/*`,
        (request) => {
            const { groupId, productId } = comboGroupProductIdsFromUrl(request.url)
            const group = combo.optionGroups.find((item) => item.id === groupId)
            if (!group) {
                request.reply({ statusCode: 500, body: { error: { code: 'TEST_GROUP_NOT_FOUND' } } })
                return
            }
            group.products = (group.products ?? []).filter((item) => item.productId !== productId)
            request.reply({ statusCode: 204, body: '' })
        },
    ).as('removeOption')
    cy.intercept('DELETE', `**/businesses/products/${comboId}/combo-option-groups/*`, (request) => {
        const groupId = comboGroupIdFromUrl(request.url)
        combo.optionGroups = combo.optionGroups.filter((group) => group.id !== groupId)
        request.reply({ statusCode: 204, body: '' })
    }).as('deleteOptionGroup')

    return { combo }
}

function openCombo(options: { waitForDetails?: boolean } = {}) {
    cy.login()
    cy.visit('/dashboard/products')
    cy.get('button[aria-label="Editar Combo de la casa"]').click()
    if (options.waitForDetails !== false) cy.wait('@comboDetails')
    return () => cy.get('[data-testid="combo-settings-dialog"]')
}

function openEditInformation() {
    const dialog = openCombo()
    dialog().contains('button', 'Editar información').click()
    return dialog
}

function addGroup(dialog: () => Cypress.Chainable<JQuery<HTMLElement>>, name = 'Bebidas') {
    dialog().find('input[aria-label="Nombre del nuevo grupo"]').type(name)
    dialog().contains('button', 'Refresco').click()
    dialog().contains('button', 'Limonada').click()
    dialog().contains('button', 'Guardar grupo de opciones').click()
}

describe('Edición granular de combos', () => {
    it('muestra loading mientras carga la configuración', () => {
        installCatalog({ detailsDelay: 500 })
        const dialog = openCombo({ waitForDetails: false })
        dialog().find('[role="status"]').should('contain', 'Cargando configuración del combo')
        cy.wait('@comboDetails')
    })

    it('muestra error si no puede cargar la configuración', () => {
        installCatalog({ detailsError: true })
        const dialog = openCombo({ waitForDetails: false })
        cy.wait('@comboDetails')
        dialog().find('[role="alert"]').should('contain', 'No encontramos este combo')
    })

    it('muestra la información, incluidos y grupos existentes', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().contains('h3', 'Combo de la casa').should('be.visible')
        dialog().find('[data-testid="combo-included-product-edit-required-burger"]').should('be.visible')
        dialog().find('[data-testid="combo-option-group-group-sides"]').should('be.visible')
    })

    it('permite cancelar la edición de información sin enviar cambios', () => {
        installCatalog()
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear().type('Cambio cancelado')
        dialog().contains('button', 'Cancelar').click()
        dialog().contains('h3', 'Combo de la casa').should('be.visible')
        cy.get('@updateCombo.all').should('have.length', 0)
    })

    it('valida nombre vacío sin enviar actualización', () => {
        installCatalog()
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear()
        dialog().contains('button', 'Guardar cambios').click()
        dialog().find('[role="alert"]').should('contain', 'Escribe un nombre')
        cy.get('@updateCombo.all').should('have.length', 0)
    })

    it('valida precio inválido sin enviar actualización', () => {
        installCatalog()
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Precio del combo"]').clear().type('0')
        dialog().contains('button', 'Guardar cambios').click()
        dialog().find('[role="alert"]').should('contain', 'precio mayor que cero')
        cy.get('@updateCombo.all').should('have.length', 0)
    })

    it('limita nombre y descripción a sus longitudes máximas', () => {
        installCatalog()
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear().type('x'.repeat(100)).should('have.value', 'x'.repeat(80))
        dialog().find('textarea[aria-label="Descripción del combo"]').clear().type('x'.repeat(120)).should('have.value', 'x'.repeat(100))
    })

    it('guarda nombre, descripción y precio exactos', () => {
        installCatalog()
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear().type('Combo familiar')
        dialog().find('textarea[aria-label="Descripción del combo"]').clear().type('Para compartir')
        dialog().find('input[aria-label="Precio del combo"]').clear().type('245.50')
        dialog().contains('button', 'Guardar cambios').click()
        cy.wait('@updateCombo').its('request.body').should('deep.equal', { name: 'Combo familiar', description: 'Para compartir', price: 245.5 })
    })

    it('muestra loading y bloquea acciones al guardar información', () => {
        installCatalog({ updateDelay: 500 })
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear().type('Combo lento')
        dialog().contains('button', 'Guardar cambios').click()
        dialog().contains('button', 'Guardando…').should('be.disabled')
        cy.wait('@updateCombo')
    })

    it('muestra el error de actualización y conserva el formulario', () => {
        installCatalog({ updateError: true })
        const dialog = openEditInformation()
        dialog().find('input[aria-label="Nombre del combo"]').clear().type('No guardado')
        dialog().contains('button', 'Guardar cambios').click()
        cy.wait('@updateCombo')
        dialog().find('[role="alert"]').should('be.visible')
        dialog().find('input[aria-label="Nombre del combo"]').should('have.value', 'No guardado')
    })

    it('mantiene deshabilitado quitar el único producto incluido', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().find('[data-testid="combo-included-product-edit-required-burger"] button').should('be.disabled')
    })

    it('permite agregar un producto incluido después de seleccionarlo', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().contains('button', 'Agregar producto incluido').click()
        dialog().contains('button', 'Agua fresca').click()
        dialog().contains('button', 'Agregar como producto incluido').should('not.be.disabled').click()
        cy.wait('@addIncluded')
        dialog().find('[data-testid="combo-included-product-edit-water"]').should('be.visible')
    })

    it('deshabilita agregar incluido sin producto seleccionado', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().contains('button', 'Agregar producto incluido').click()
        dialog().contains('button', 'Agregar como producto incluido').should('be.disabled')
    })

    it('permite quitar un producto incluido conservando otro', () => {
        const { combo } = installCatalog()
        combo.includedProducts.push({ id: 'included-water', productId: 'edit-water', sortOrder: 1, product: productRecord('edit-water') })
        const dialog = openCombo()
        cy.on('window:confirm', () => true)
        dialog().find('[data-testid="combo-included-product-edit-required-burger"] button').click()
        cy.wait('@removeIncluded')
        dialog().find('[data-testid="combo-included-product-edit-required-burger"]').should('not.exist')
    })

    it('bloquea agregar productos obligatorios cuando el combo ya tiene diez', () => {
        const { combo } = installCatalog()
        combo.includedProducts = catalogProducts.slice(0, 10).map((product, sortOrder) => ({
            id: `included-${product.id}`,
            productId: product.id,
            sortOrder,
            product,
        }))
        const dialog = openCombo()
        dialog().contains('10 incluidos').should('be.visible')
        dialog()
            .contains('button', 'Agregar producto incluido')
            .should('be.disabled')
            .and('have.attr', 'title', 'El combo admite hasta 10 productos incluidos.')
    })

    it('mantiene deshabilitado agregar grupo sin nombre ni dos productos', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().contains('button', 'Guardar grupo de opciones').should('be.disabled')
    })

    it('crea un grupo con el payload correcto', () => {
        installCatalog()
        const dialog = openCombo()
        addGroup(dialog)
        cy.wait('@createOptionGroup').its('request.body').should('deep.equal', { name: 'Bebidas', productIds: ['edit-soda', 'edit-lemonade'], minSelections: 1, maxSelections: 1 })
    })

    it('muestra el error del backend al crear un grupo', () => {
        installCatalog()
        cy.intercept('POST', `**/businesses/products/${comboId}/combo-option-groups`, { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } }).as('createGroupFailure')
        const dialog = openCombo()
        addGroup(dialog)
        cy.wait('@createGroupFailure')
        cy.contains('No se pudo crear el grupo').should('be.visible')
    })

    it('bloquea crear un sexto grupo de opciones', () => {
        const { combo } = installCatalog()
        const baseGroup = combo.optionGroups[0]!
        combo.optionGroups = Array.from({ length: 5 }, (_, index) => ({
            ...baseGroup,
            id: `group-limit-${index + 1}`,
            name: `Grupo ${index + 1}`,
        }))
        const dialog = openCombo()
        dialog().find('input[aria-label="Nombre del nuevo grupo"]').type('Grupo 6')
        dialog().contains('button', 'Agua fresca').click()
        dialog().contains('button', 'Refresco').click()
        dialog().contains('button', 'Guardar grupo de opciones').click()
        cy.get('@createOptionGroup.all').should('have.length', 0)
        dialog().find('input[aria-label="Nombre del nuevo grupo"]').should('have.value', 'Grupo 6')
    })

    it('deshabilita quitar una opción cuando el grupo solo tiene dos', () => {
        installCatalog()
        const dialog = openCombo()
        dialog().find('[data-testid="combo-option-group-group-sides"] [aria-label^="Quitar "]').each(($button) => cy.wrap($button).should('be.disabled'))
    })

    it('deshabilita agregar una sexta opción cuando el grupo ya tiene cinco', () => {
        const { combo } = installCatalog()
        const group = combo.optionGroups[0]!
        group.products = catalogProducts.slice(1, 6).map((product, sortOrder) => ({
            id: `choice-${product.id}`,
            productId: product.id,
            sortOrder,
            product,
        }))
        group.productIds = group.products.map((choice) => choice.productId)
        const dialog = openCombo()
        const groupElement = () => dialog().find('[data-testid="combo-option-group-group-sides"]')
        groupElement()
            .contains('button', 'Agregar opción')
            .should('be.disabled')
            .and('have.attr', 'title', 'Cada grupo admite hasta 5 productos.')
    })

    it('permite agregar y quitar una opción del grupo', () => {
        installCatalog()
        const dialog = openCombo()
        const group = () => dialog().find('[data-testid="combo-option-group-group-sides"]')
        group().contains('button', 'Agregar opción').click()
        group().contains('button', 'Té helado').click()
        group().contains('button', 'Agregar opción al grupo').click()
        cy.wait('@addOption')
        group().find('[data-testid="combo-option-choice-edit-iced-tea"]').should('be.visible')
        group().find('[data-testid="combo-option-choice-edit-iced-tea"] button').click()
        cy.wait('@removeOption')
        group().find('[data-testid="combo-option-choice-edit-iced-tea"]').should('not.exist')
    })

    it('permite renombrar un grupo con el payload correcto', () => {
        installCatalog()
        const dialog = openCombo()
        const group = () => dialog().find('[data-testid="combo-option-group-group-sides"]')
        group().contains('button', 'Editar grupo').click()
        dialog().find('input[aria-label="Nombre del grupo"]').clear().type('Acompañamientos')
        group().contains('button', 'Guardar').click()
        cy.wait('@updateOptionGroup').its('request.body').should('deep.equal', { name: 'Acompañamientos' })
    })

    it('elimina un grupo después de confirmar', () => {
        const { combo } = installCatalog()
        const dialog = openCombo()
        cy.on('window:confirm', () => true)
        dialog().find('button[aria-label="Eliminar grupo Acompañamiento"]').click()
        cy.wait('@deleteOptionGroup')
        dialog().find('[data-testid="combo-option-group-group-sides"]').should('not.exist')
        cy.then(() => expect(combo.optionGroups).to.have.length(0))
    })
})

export {}
