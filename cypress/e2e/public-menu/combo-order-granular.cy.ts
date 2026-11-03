const slug = 'combos-granulares-e2e'
const businessId = 'business-combos-granulares-e2e'
const comboId = 'combo-granular-e2e'
const sideGroupId = 'combo-group-sides-e2e'
const drinkGroupId = 'combo-group-drinks-e2e'
const friesChoiceId = 'combo-choice-fries-e2e'
const wingsChoiceId = 'combo-choice-wings-e2e'
const waterChoiceId = 'combo-choice-water-e2e'
const sodaChoiceId = 'combo-choice-soda-e2e'

const choice = (id: string, productId: string, name: string, isAvailable = true) => ({
    id,
    productId,
    sortOrder: 0,
    product: {
        id: productId,
        name,
        description: null,
        price: 0,
        imageUrl: null,
        categoryId: 'category-combos-granulares-e2e',
        isAvailable,
    },
})

function installComboCatalog(options: { unavailableChoice?: string; longNames?: boolean } = {}) {
    const unavailable = options.unavailableChoice
    const longComboName = options.longNames
        ? 'Combo familiar de la casa con ingredientes especiales y porción completa'
        : 'Combo familiar'
    const longIncludedName = options.longNames
        ? 'Hamburguesa artesanal especial con queso, vegetales y salsa de la casa'
        : 'Hamburguesa incluida'
    const combo = {
        id: comboId,
        businessId,
        categoryId: 'category-combos-granulares-e2e',
        name: longComboName,
        description: 'Combo para probar selecciones.',
        price: 199,
        imageUrl: null,
        sortOrder: 0,
        isAvailable: true,
        type: 'COMBO',
        includedProducts: [
            {
                id: 'included-burger-e2e',
                productId: 'product-burger-e2e',
                sortOrder: 0,
                product: {
                    id: 'product-burger-e2e',
                    name: longIncludedName,
                    description: null,
                    price: 0,
                    imageUrl: null,
                    categoryId: 'category-combos-granulares-e2e',
                    isAvailable: true,
                },
            },
        ],
        comboOptionGroups: [
            {
                id: sideGroupId,
                comboProductId: comboId,
                name: 'Acompañamiento',
                minSelections: 1,
                maxSelections: 1,
                sortOrder: 0,
                products: [
                    choice(friesChoiceId, 'product-fries-e2e', 'Papas gajo', unavailable !== friesChoiceId),
                    choice(wingsChoiceId, 'product-wings-e2e', 'Alitas', unavailable !== wingsChoiceId),
                ],
            },
            {
                id: drinkGroupId,
                comboProductId: comboId,
                name: 'Bebida',
                minSelections: 1,
                maxSelections: 1,
                sortOrder: 1,
                products: [
                    choice(waterChoiceId, 'product-water-e2e', 'Agua fresca', unavailable !== waterChoiceId),
                    choice(sodaChoiceId, 'product-soda-e2e', 'Refresco', unavailable !== sodaChoiceId),
                ],
            },
        ],
        optionGroups: [],
    }

    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: {
            business: {
                id: businessId,
                name: 'Restaurante de combos',
                slug,
                description: null,
                logoUrl: null,
                logoBlurUrl: null,
                coverUrl: null,
                coverBlurUrl: null,
                ubication: 'Mazatlán',
                ubicationMaps: null,
                businessSchedule: null,
                whatsappNumber: '+526691234567',
            },
            menus: [
                {
                    id: 'menu-combos-granulares-e2e',
                    businessId,
                    name: 'Menú',
                    description: null,
                    isActive: true,
                    categories: [
                        {
                            id: 'category-combos-granulares-e2e',
                            businessId,
                            menuId: 'menu-combos-granulares-e2e',
                            name: 'Combos',
                            description: null,
                            sortOrder: 0,
                            isActive: true,
                            products: [combo],
                        },
                    ],
                },
            ],
        },
    }).as('getComboCatalog')
}

function openComboSelector() {
    cy.contains('article', /Combo familiar/)
        .contains('button', 'Seleccionar opciones')
        .click()
    return () => cy.get('[role="dialog"][aria-labelledby="customize-title"]')
}

function stubWhatsApp() {
    cy.window().then((window) => {
        cy.stub(window, 'open').returns({
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        })
    })
}

describe('Selección de combos en el catálogo público', () => {
    it('muestra los productos incluidos', () => {
        installComboCatalog()
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        openComboSelector()().contains('Hamburguesa incluida').should('be.visible')
    })

    it('mantiene dentro del modal los nombres largos del combo y sus incluidos en móvil', () => {
        installComboCatalog({ longNames: true })
        cy.viewport(375, 812)
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        openComboSelector()().within(() => {
            cy.contains('Combo familiar de la casa con ingredientes especiales y porción completa')
                .should('be.visible')
            cy.contains('Hamburguesa artesanal especial con queso, vegetales y salsa de la casa')
                .should('be.visible')
        })
        cy.get('[role="dialog"][aria-labelledby="customize-title"]').then(($dialog) => {
            expect($dialog[0]!.scrollWidth).to.be.lte($dialog[0]!.clientWidth)
        })
    })

    it('deshabilita el botón si falta una selección obligatoria', () => {
        installComboCatalog()
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        openComboSelector()().contains('button', 'Agregar al pedido').should('be.disabled')
    })

    it('mantiene el botón deshabilitado hasta completar todos los grupos', () => {
        installComboCatalog()
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        const dialog = openComboSelector()
        dialog().contains('label', 'Papas gajo').click()
        dialog().contains('button', 'Agregar al pedido').should('be.disabled')
        dialog().contains('label', 'Agua fresca').click()
        dialog().contains('button', 'Agregar al pedido').should('not.be.disabled')
    })

    it('oculta una opción que ya no está disponible', () => {
        installComboCatalog({ unavailableChoice: wingsChoiceId })
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        const dialog = openComboSelector()
        dialog().contains('label', 'Papas gajo').should('be.visible')
        dialog().contains('label', 'Alitas').should('not.exist')
    })

    it('envía cada selección del combo en la orden', () => {
        installComboCatalog()
        cy.intercept('POST', '**/businesses/*/orders', {
            statusCode: 201,
            body: {
                order: {
                    id: 'order-combo-granular-e2e',
                    orderNumber: 1,
                    status: 'PENDING',
                    customerId: null,
                    customerName: 'Jorge',
                    customerPhone: '6691234567',
                    subtotal: 199,
                    total: 199,
                    items: [],
                    statusHistory: [],
                },
            },
        }).as('createComboOrder')
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        stubWhatsApp()
        const dialog = openComboSelector()
        dialog().contains('label', 'Papas gajo').click()
        dialog().contains('label', 'Agua fresca').click()
        dialog().contains('button', 'Agregar al pedido').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type('Jorge')
        cy.get('#customer-phone').type('6691234567')
        cy.contains('[role="dialog"] button', 'Confirmar pedido').click()
        cy.wait('@createComboOrder').its('request.body.items').should('deep.equal', [
            {
                productId: comboId,
                quantity: 1,
                optionIds: [],
                comboChoiceIds: [friesChoiceId, waterChoiceId],
            },
        ])
    })

    it('muestra el error de la orden y permite conservar el carrito para reintentar', () => {
        installComboCatalog()
        cy.intercept('POST', '**/businesses/*/orders', {
            statusCode: 500,
            body: { error: { code: 'INTERNAL_ERROR' } },
        }).as('createComboOrderFailure')
        cy.visit(`/${slug}`)
        cy.wait('@getComboCatalog')
        stubWhatsApp()
        const dialog = openComboSelector()
        dialog().contains('label', 'Papas gajo').click()
        dialog().contains('label', 'Agua fresca').click()
        dialog().contains('button', 'Agregar al pedido').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type('Jorge')
        cy.get('#customer-phone').type('6691234567')
        cy.contains('[role="dialog"] button', 'Confirmar pedido').click()
        cy.wait('@createComboOrderFailure')
        cy.get('[data-testid="order-error"]')
            .should('be.visible')
            .and('contain', 'Ocurrió un problema en el servidor')
        cy.contains('Combo familiar').should('be.visible')
        cy.contains('[role="dialog"] button', 'Confirmar pedido').should('not.be.disabled')
    })
})

export {}
