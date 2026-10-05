type MenuCategory = {
    id: string
    menuId: string
    name: string
    description: string | null
    isActive: boolean
    sortOrder: number
    products: never[]
}

type Product = {
    id: string
    categoryId: string
    name: string
    description: string
    price: number
    imageUrl: string | null
    isAvailable: boolean
    active: boolean
    sortOrder: number
    optionGroups?: OptionGroup[]
}

type Option = {
    id: string
    optionGroupId: string
    name: string
    price: number
    isAvailable: boolean
    sortOrder: number
}

type OptionGroup = {
    id: string
    productId: string
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    isActive: boolean
    sortOrder: number
    options?: Option[]
}

type CatalogState = {
    menu: {
        id: string
        name: string
        description: string
        isActive: boolean
        categories: MenuCategory[]
    } | null
    category: MenuCategory | null
    product: Product | null
    groups: OptionGroup[]
    options: Option[]
}

type CreationCounters = {
    menu?: number
    category?: number
    product?: number
    group?: number
    option?: number
}

const businessId = 'business-catalog-e2e'
const menuId = 'menu-catalog-e2e'
const categoryId = 'category-catalog-e2e'
const productId = 'product-catalog-e2e'
const groupId = 'group-catalog-e2e'

function createState(): CatalogState {
    return { menu: null, category: null, product: null, groups: [], options: [] }
}

function catalogBusinessResponse() {
    return {
        id: businessId,
        name: 'Negocio Cypress',
        slug: 'negocio-cypress',
        description: 'Negocio para probar el catálogo.',
        ubication: 'Culiacán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: {
            days: [{ key: 'monday', label: 'Lun', enabled: true }],
            openTime: '09:00',
            closeTime: '20:00',
        },
    }
}

function requestField(body: unknown, field: string, fallback: string) {
    if (body && typeof body === 'object' && field in body) {
        const value = (body as Record<string, unknown>)[field]
        return value == null ? fallback : String(value)
    }

    if (typeof body === 'string') {
        const match = body.match(new RegExp(`name="${field}"[\\s\\S]*?\\r?\\n\\r?\\n([^\\r\\n]*)`))
        if (match?.[1]) return match[1]
    }

    return fallback
}

function installCatalogApi(state: CatalogState, counters: CreationCounters = {}) {
    cy.intercept('GET', '**/api/v1/businesses/mine', {
        statusCode: 200,
        body: { business: catalogBusinessResponse() },
    })

    cy.intercept('GET', '**/api/v1/businesses/mine/menus', (request) => {
        request.alias = 'listMenus'
        request.reply({
            statusCode: 200,
            body: state.menu ? [state.menu] : [],
        })
    })

    cy.intercept('GET', `**/api/v1/businesses/menus/${menuId}`, (request) => {
        request.alias = 'getMenu'
        request.reply({ statusCode: 200, body: state.menu })
    })

    cy.intercept('POST', '**/api/v1/businesses/*/menus', (request) => {
        request.alias = 'createMenu'
        counters.menu = (counters.menu ?? 0) + 1
        const body = request.body as { name: string; description: string }
        state.menu = {
            id: menuId,
            name: body.name,
            description: body.description,
            isActive: true,
            categories: [],
        }
        request.reply({ delay: 350, statusCode: 201, body: state.menu })
    })

    cy.intercept('POST', '**/api/v1/businesses/*/categories', (request) => {
        request.alias = 'createCategory'
        counters.category = (counters.category ?? 0) + 1
        const body = request.body as { name: string; description: string; menuId: string }
        state.category = {
            id: categoryId,
            menuId: body.menuId,
            name: body.name,
            description: body.description,
            isActive: true,
            sortOrder: 0,
            products: [],
        }
        if (state.menu) state.menu.categories = [state.category]
        request.reply({ delay: 350, statusCode: 201, body: state.category })
    })

    cy.intercept('GET', `**/api/v1/businesses/categories/${categoryId}/products`, (request) => {
        request.alias = 'listProducts'
        request.reply({ statusCode: 200, body: state.product ? [state.product] : [] })
    })

    cy.intercept('POST', '**/api/v1/businesses/*/products', (request) => {
        request.alias = 'createProduct'
        counters.product = (counters.product ?? 0) + 1
        const body = request.body
        state.product = {
            id: productId,
            categoryId,
            name: requestField(body, 'name', `Producto ${counters.product}`),
            description: requestField(body, 'description', ''),
            price: Number(requestField(body, 'price', '0')),
            imageUrl: null,
            isAvailable: true,
            active: true,
            sortOrder: 0,
            optionGroups: [],
        }
        request.reply({ delay: 350, statusCode: 201, body: state.product })
    })

    cy.intercept('GET', `**/api/v1/businesses/products/${productId}`, (request) => {
        request.alias = 'getProduct'
        request.reply({ statusCode: 200, body: state.product })
    })

    cy.intercept('PATCH', `**/api/v1/businesses/products/${productId}`, (request) => {
        request.alias = 'updateProduct'
        if (state.product) {
            state.product = {
                ...state.product,
                name: requestField(request.body, 'name', state.product.name),
                description: requestField(request.body, 'description', state.product.description),
                price: Number(requestField(request.body, 'price', String(state.product.price))),
            }
        }
        request.reply({ statusCode: 200, body: state.product })
    })

    cy.intercept('DELETE', `**/api/v1/businesses/products/${productId}`, (request) => {
        request.alias = 'deleteProduct'
        state.product = null
        request.reply({ statusCode: 204, body: null })
    })

    cy.intercept('GET', `**/api/v1/businesses/products/${productId}/option-groups`, (request) => {
        request.alias = 'listGroups'
        request.reply({ statusCode: 200, body: state.groups })
    })

    cy.intercept('POST', `**/api/v1/businesses/products/${productId}/option-groups`, (request) => {
        request.alias = 'createGroup'
        counters.group = (counters.group ?? 0) + 1
        const body = request.body as {
            name: string
            isRequired: boolean
            minSelections: number
            maxSelections: number
            options: Array<{ name: string; price: number; isAvailable: boolean }>
        }
        state.options = body.options.map((option, index) => ({
            id: `option-catalog-e2e-${index + 1}`,
            optionGroupId: groupId,
            ...option,
            sortOrder: index,
        }))
        state.groups = [
            {
                id: groupId,
                productId,
                name: body.name,
                isRequired: body.isRequired,
                minSelections: body.minSelections,
                maxSelections: body.maxSelections,
                isActive: true,
                sortOrder: 0,
                options: state.options,
            },
        ]
        if (state.product) state.product.optionGroups = state.groups
        request.reply({ delay: 350, statusCode: 201, body: state.groups[0] })
    })

    cy.intercept('GET', `**/api/v1/businesses/option-groups/${groupId}/options`, (request) => {
        request.alias = 'listOptions'
        request.reply({ statusCode: 200, body: state.options })
    })

    cy.intercept('POST', `**/api/v1/businesses/option-groups/${groupId}/options`, (request) => {
        request.alias = 'createOption'
        counters.option = (counters.option ?? 0) + 1
        const body = request.body as { name: string; price: number; isAvailable: boolean }
        const option = {
            id: `option-catalog-e2e-${state.options.length + 1}`,
            optionGroupId: groupId,
            ...body,
            sortOrder: state.options.length,
        }
        state.options = [...state.options, option]
        if (state.groups[0]) state.groups[0].options = state.options
        if (state.product) state.product.optionGroups = state.groups
        request.reply({ delay: 350, statusCode: 201, body: option })
    })
}

function fillProduct(name: string, price: string, description: string) {
    cy.get('#product-name').clear().type(name)
    cy.get('#product-description').clear().type(description)
    cy.get('#product-price').clear().type(price)
}

describe('Catálogo · menú, categoría, productos y opciones', () => {
    beforeEach(() => {
        cy.login()
    })

    it('completa el flujo y evita duplicados en cada creación', () => {
        const state = createState()
        const counters: CreationCounters = {}
        installCatalogApi(state, counters)

        cy.visit('/create-menu')
        cy.wait('@listMenus')
        cy.contains('button', 'Crear menú').first().click()
        cy.get('[role="dialog"]').should('have.attr', 'aria-labelledby', 'modal-title')
        cy.get('#menu-name').type('Menú de verano')
        cy.get('#menu-description').type('Tacos y bebidas para la temporada.')
        cy.get('[role="dialog"] button[type="submit"]').should('contain', 'Crear menú').click()
        cy.get('[role="dialog"] button[type="submit"]')
            .should('be.disabled')
            .and('contain', 'Creando menú…')
            .click({ force: true })
        cy.wait('@createMenu')
        cy.then(() => expect(counters.menu).to.eq(1))
        cy.get('[role="dialog"]').should('not.exist')
        cy.contains('button', 'Menú de verano').click()
        cy.wait('@getMenu')

        cy.contains('button', 'Agregar').click()
        cy.get('input[placeholder="Nombre de categoría"]').type('Tacos')
        cy.get('textarea[placeholder="Descripción (opcional)"]').type('Tacos de la casa')
        cy.contains('button', 'Guardar categoría').click()
        cy.contains('button', 'Guardando…').should('be.disabled').click({ force: true })
        cy.wait('@createCategory')
        cy.then(() => expect(counters.category).to.eq(1))
        cy.contains('button', 'Menú de verano').should('contain', '1 categorías')
        cy.contains('Tacos').should('be.visible')

        cy.contains('button', 'Agregar producto').click()
        cy.get('[role="dialog"]').should('contain', 'Agregar producto')
        fillProduct('Taco de asada', '89', 'Tortilla, asada y cebolla.')
        cy.get('[role="dialog"] button[type="submit"]').should('contain', 'Crear producto').click()
        cy.get('[role="dialog"] button[type="submit"]')
            .should('be.disabled')
            .and('contain', 'Guardando producto…')
            .click({ force: true })
        cy.wait('@createProduct')
        cy.then(() => expect(counters.product).to.eq(1))
        cy.get('button[aria-label="Cerrar"]').last().click()
        cy.contains('Taco de asada').should('be.visible')
        cy.contains('$89.00').should('be.visible')

        cy.get('button[aria-label="Editar Taco de asada"]').click()
        cy.get('#product-name').should('have.value', 'Taco de asada')
        fillProduct('Taco de asada especial', '99.50', 'Tortilla dorada, asada y cebolla.')
        cy.get('[role="dialog"] button[type="submit"]').click()
        cy.wait('@updateProduct')
        cy.contains('Taco de asada especial').should('be.visible')
        cy.contains('$99.50').should('be.visible')

        cy.on('window:confirm', () => true)
        cy.get('button[aria-label="Eliminar Taco de asada especial"]').click()
        cy.wait('@deleteProduct')
        cy.contains('Taco de asada especial').should('not.exist')

        cy.contains('button', 'Agregar producto').click()
        fillProduct('Quesadilla de queso', '75', 'Queso fundido en tortilla de harina.')
        cy.get('[role="dialog"] button[type="submit"]').click()
        cy.wait('@createProduct')
        cy.then(() => expect(counters.product).to.eq(2))
        cy.get('button[aria-label="Cerrar"]').last().click()
        cy.contains('Quesadilla de queso').should('be.visible')

        cy.get('button[aria-label="Editar Quesadilla de queso"]').click()
        cy.wait('@listGroups')
        cy.contains('button', 'Crear grupo').click()
        cy.get('[role="dialog"]').last().find('input[placeholder="Ej. Extras"]').type('Extras')
        cy.get('[role="dialog"]').last().find('input[inputmode="numeric"]').eq(0).clear().type('1')
        cy.get('[role="dialog"]').last().find('input[inputmode="numeric"]').eq(1).clear().type('2')
        cy.get('#draft-option-name').type('Aguacate')
        cy.get('#draft-option-price').clear().type('20')
        cy.get('[role="dialog"]').last().find('button[aria-label="Agregar opción"]').click()
        cy.get('[role="dialog"]').last().contains('Aguacate').should('be.visible')
        cy.get('[role="dialog"]').last().contains('button', 'Crear grupo').click()
        cy.get('[role="dialog"]')
            .last()
            .contains('button', 'Guardando…')
            .should('be.disabled')
            .click({ force: true })
        cy.wait('@createGroup')
        cy.wait('@listGroups')
        cy.then(() => expect(counters.group).to.eq(1))
        cy.contains('h5', 'Extras').should('be.visible')
        cy.contains('Aguacate').should('be.visible')
        cy.contains('Selecciona 1–2').should('be.visible')

        cy.contains('button', 'Agregar opción').click()
        cy.get('[role="dialog"]').last().should('contain', 'Agregar opción')
        cy.get('[role="dialog"]').last().find('input[placeholder="Ej. Queso extra"]').type('Tocino')
        cy.get('[role="dialog"]').last().find('input[inputmode="decimal"]').clear().type('25')
        cy.get('[role="dialog"]').last().contains('button', 'Agregar opción').click()
        cy.get('[role="dialog"]')
            .last()
            .contains('button', 'Guardando…')
            .should('be.disabled')
            .click({ force: true })
        cy.wait('@createOption')
        cy.wait('@listOptions')
        cy.then(() => expect(counters.option).to.eq(1))
        cy.contains('Tocino').should('be.visible')

        cy.get('[role="dialog"]').last().find('button[aria-label="Cerrar"]').click()
        cy.get('[role="dialog"]')
            .should('have.length', 1)
            .within(() => {
                cy.contains('h5', 'Extras').should('be.visible')
                cy.contains('Aguacate').should('be.visible')
                cy.contains('Tocino').should('be.visible')
            })
    })

    it('no crea menú ni producto cuando faltan datos obligatorios', () => {
        const state = createState()
        const counters: CreationCounters = {}

        installCatalogApi(state, counters)

        cy.visit('/create-menu')
        cy.wait('@listMenus')
        cy.contains('button', 'Crear menú').first().click()
        cy.get('[role="dialog"] button[type="submit"]').click()
        cy.get('[role="dialog"]').contains('Escribe un nombre para el menú.').should('be.visible')
        cy.then(() => expect(counters.menu ?? 0).to.eq(0))
    })
})

export {}
