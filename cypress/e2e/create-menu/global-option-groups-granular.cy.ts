export {}

type Option = {
    id: string
    name: string
    price: number
    minSelections: number
    maxSelections: number
    isAvailable: boolean
}

type Group = {
    id: string
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    isActive: boolean
    version: number
    productIds: string[]
    options: Option[]
}

type State = { groups: Group[]; products: Array<{ id: string; name: string }> }

const businessId = 'business-global-options-e2e'
const groupId = 'global-group-e2e'
const productId = 'product-global-e2e'

function group(name = 'Extras global', options: Option[] = []): Group {
    return {
        id: groupId,
        name,
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        isActive: true,
        version: 1,
        productIds: [],
        options,
    }
}

function detail(value: Group) {
    return {
        group: {
            ...value,
            productsCount: value.productIds.length,
        },
    }
}

function summary(value: Group) {
    const { options: _options, productIds: _productIds, ...rest } = value
    return { ...rest, productsCount: value.productIds.length }
}

function installCreateMenuApi(
    state: State,
    options: { detailDelay?: number; failFirstDetail?: boolean; failFirstList?: boolean } = {},
) {
    let detailAttempts = 0
    let listAttempts = 0
    cy.intercept({ method: 'GET', pathname: '/api/v1/businesses/mine' }, (request) => {
        request.alias = 'currentBusiness'
        request.reply({
            statusCode: 200,
            body: {
                business: {
                    id: businessId,
                    name: 'Restaurante global E2E',
                    slug: 'global-options-e2e',
                    description: null,
                    ubication: null,
                    businessSchedule: null,
                },
            },
        })
    })
    cy.intercept({ method: 'GET', pathname: '/api/v1/businesses/mine/menus' }, (request) => {
        request.alias = 'listMenus'
        request.reply({ statusCode: 200, body: [] })
    })
    cy.intercept(
        { method: 'GET', pathname: '/api/v1/businesses/global-option-groups' },
        (request) => {
        request.alias = 'listGlobalGroups'
        listAttempts += 1
        if (options.failFirstList && listAttempts === 1) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
            return
        }
        request.reply({ statusCode: 200, body: { groups: state.groups.map(summary) } })
        },
    )
    cy.intercept(
        {
            method: 'GET',
            pathname: `/api/v1/businesses/global-option-groups/${groupId}`,
        },
        (request) => {
        request.alias = 'globalGroupDetail'
        detailAttempts += 1
        if (options.failFirstDetail && detailAttempts === 1) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Detail failed' } } })
            return
        }
        request.reply({ delay: options.detailDelay, statusCode: 200, body: detail(state.groups[0]) })
        },
    )
    cy.intercept(
        { method: 'GET', pathname: `/api/v1/businesses/${businessId}/products` },
        (request) => {
        request.alias = 'globalProducts'
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1)
        const limit = Number(new URL(request.url).searchParams.get('limit') ?? 10)
        request.reply({
            statusCode: 200,
            body: {
                products: state.products.slice((page - 1) * limit, page * limit),
                page,
                limit,
                total: state.products.length,
            },
        })
        },
    )
    cy.intercept(
        { method: 'POST', pathname: '/api/v1/businesses/global-option-groups' },
        (request) => {
        request.alias = 'createGlobalGroup'
        const created = group(String(request.body.name), [])
        state.groups.push(created)
        request.reply({ statusCode: 201, body: detail(created) })
        },
    )
    cy.intercept(
        {
            method: 'PATCH',
            pathname: `/api/v1/businesses/global-option-groups/${groupId}`,
        },
        (request) => {
        request.alias = 'updateGlobalGroup'
        const current = state.groups[0]
        Object.assign(current, request.body, { version: current.version + 1 })
        request.reply({ statusCode: 200, body: detail(current) })
        },
    )
    cy.intercept(
        {
            method: 'PUT',
            pathname: `/api/v1/businesses/global-option-groups/${groupId}/options`,
        },
        (request) => {
        request.alias = 'replaceGlobalOptions'
        const current = state.groups[0]
        current.options = request.body.options.map((option: Partial<Option>, index: number) => ({
            ...option,
            id: option.id ?? `option-global-${index + 1}`,
        }))
        current.version += 1
        request.reply({ statusCode: 200, body: detail(current) })
        },
    )
    cy.intercept(
        {
            method: 'PUT',
            pathname: `/api/v1/businesses/global-option-groups/${groupId}/products`,
        },
        (request) => {
        request.alias = 'assignGlobalProducts'
        const current = state.groups[0]
        current.productIds = request.body.productIds
        current.version += 1
        request.reply({ statusCode: 200, body: detail(current) })
        },
    )

    return { detailAttempts: () => detailAttempts }
}

function visitGlobalGroups() {
    cy.visit('/create-menu')
    // The panel loads after the business/catalog dependencies resolve. Waiting
    // directly for its request keeps this helper valid for an empty catalog,
    // where the menus query can be disabled and never fire.
    cy.wait('@listGlobalGroups')
    cy.contains('Grupos de opciones globales').should('be.visible')
}

describe('Grupos globales · casos de uso granulares', () => {
    beforeEach(() => cy.login())

    it('mantiene el detalle vacío y carga opciones/productos solo al seleccionar un grupo', () => {
        const state: State = {
            groups: [
                group('Extras global', [
                    {
                        id: 'option-1',
                        name: 'Queso extra',
                        price: 15,
                        minSelections: 0,
                        maxSelections: 2,
                        isAvailable: true,
                    },
                ]),
            ],
            products: [{ id: productId, name: 'Hamburguesa clásica' }],
        }
        const api = installCreateMenuApi(state)
        visitGlobalGroups()

        cy.contains('Elige un grupo para editarlo').should('be.visible')
        cy.then(() => expect(api.detailAttempts()).to.equal(0))
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')
        cy.wait('@globalProducts')
        cy.contains('Queso extra').should('be.visible')
        cy.contains('Hamburguesa clásica').should('be.visible')
    })

    it('muestra skeleton del detalle y permite reintentar si el grupo falla', () => {
        const state: State = { groups: [group()], products: [] }
        installCreateMenuApi(state, { detailDelay: 500, failFirstDetail: true })
        visitGlobalGroups()

        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')
        cy.contains('No pudimos cargar este grupo').should('be.visible')
        cy.contains('button', 'Reintentar').click()
        cy.get('[aria-label="Cargando grupo global"]').should('be.visible')
        cy.wait('@globalGroupDetail')
        cy.contains('Nombre').should('be.visible')
    })

    it('muestra el error de la lista y puede recargarla sin seleccionar un grupo', () => {
        const state: State = { groups: [], products: [] }
        installCreateMenuApi(state, { failFirstList: true })
        visitGlobalGroups()

        cy.get('[role="alert"]').should('be.visible')
        cy.get('[aria-label="Recargar grupos"]').click()
        cy.wait('@listGlobalGroups')
        cy.contains('Todavía no hay grupos globales').should('be.visible')
        cy.contains('Elige un grupo para editarlo').should('not.exist')
    })

    it('crea un grupo sin cargar su detalle hasta que el restaurante lo selecciona', () => {
        const state: State = { groups: [], products: [] }
        installCreateMenuApi(state)
        visitGlobalGroups()

        cy.contains('Todavía no hay grupos globales').should('be.visible')
        cy.contains('button', 'Crear grupo').click()
        cy.wait('@createGlobalGroup')
        cy.contains('button', 'Nuevo grupo').should('be.visible')
        cy.contains('Elige un grupo para editarlo').should('be.visible')
        cy.contains('button', 'Nuevo grupo').click()
        cy.wait('@globalGroupDetail')
        cy.get('input').filter('[value="Nuevo grupo"]').should('be.visible')
    })

    it('solo muestra el nombre faltante al intentar agregar otra opción y limita a diez', () => {
        const state: State = { groups: [group()], products: [] }
        installCreateMenuApi(state)
        visitGlobalGroups()
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')

        cy.contains('button', '+ Agregar opción').click()
        cy.contains('Escribe el nombre de la opción.').should('not.exist')
        cy.contains('button', '+ Agregar opción').click()
        cy.contains('Escribe el nombre de la opción.').should('be.visible')

        cy.reload()
        cy.wait('@listGlobalGroups')
        state.groups[0].options = Array.from({ length: 10 }, (_, index) => ({ id: `option-${index}`, name: `Extra ${index + 1}`, price: 0, minSelections: 0, maxSelections: 1, isAvailable: true }))
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')
        cy.contains('10/10').should('be.visible')
        cy.contains('button', 'Límite de 10 opciones alcanzado').click()
        cy.contains('Un grupo global puede tener como máximo 10 opciones.').should('be.visible')
    })

    it('guarda productos seleccionados y los conserva después de recargar', () => {
        const state: State = {
            groups: [
                group('Extras global', [
                    {
                        id: 'option-1',
                        name: 'Tocino',
                        price: 20,
                        minSelections: 0,
                        maxSelections: 1,
                        isAvailable: true,
                    },
                ]),
            ],
            products: [{ id: productId, name: 'Hamburguesa clásica' }],
        }
        installCreateMenuApi(state)
        visitGlobalGroups()
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')
        cy.contains('label', 'Hamburguesa clásica').find('input[type="checkbox"]').check()
        cy.contains('button', 'Guardar cambios').click()
        cy.wait('@assignGlobalProducts').its('request.body.productIds').should('deep.equal', [productId])

        cy.reload()
        cy.wait('@listGlobalGroups')
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalGroupDetail')
        cy.contains('label', 'Hamburguesa clásica').find('input[type="checkbox"]').should('be.checked')
    })

    it('pagina los productos asignables de diez en diez sin perder la selección actual', () => {
        const products = Array.from({ length: 11 }, (_, index) => ({
            id: `product-${index + 1}`,
            name: `Producto ${index + 1}`,
        }))
        const state: State = { groups: [group()], products }
        installCreateMenuApi(state)
        visitGlobalGroups()
        cy.contains('button', 'Extras global').click()
        cy.wait('@globalProducts')
        cy.contains('Producto 1').should('be.visible')
        cy.contains('Producto 11').should('not.exist')
        cy.contains('button', 'Siguiente').click()
        cy.wait('@globalProducts')
        cy.contains('Producto 11').should('be.visible')
        cy.contains('Página 2 de 2').should('be.visible')
    })

    it('muestra seleccionar opciones en el menú público cuando el catálogo recibe un grupo global asignado', () => {
        cy.intercept('GET', '**/api/v1/public/businesses/global-options-public/catalog', {
            statusCode: 200,
            body: {
                business: { id: businessId, name: 'Restaurante público', slug: 'global-options-public', description: null, logoUrl: null, logoBlurUrl: null, coverUrl: null, coverBlurUrl: null, ubication: null, ubicationMaps: null, businessSchedule: null },
                menus: [{ id: 'public-menu', businessId, name: 'Principal', description: null, isActive: true, categories: [{ id: 'public-category', businessId, menuId: 'public-menu', name: 'Hamburguesas', description: null, sortOrder: 0, isActive: true, products: [{ id: productId, businessId, categoryId: 'public-category', name: 'Hamburguesa clásica', description: null, price: 90, priceOriginal: 90, priceFinal: 90, imageUrl: null, sortOrder: 0, isAvailable: true, optionGroups: [{ id: groupId, productId, name: 'Extras globales', isRequired: false, minSelections: 0, maxSelections: 1, sortOrder: 0, isActive: true, options: [{ id: 'option-public', optionGroupId: groupId, name: 'Queso extra', price: 15, minSelections: 0, maxSelections: 1, sortOrder: 0, isAvailable: true }] }] }] }] }],
            },
        })
        cy.intercept('GET', '**/api/v1/public/businesses/global-options-public/discounts', { statusCode: 200, body: { discounts: [] } })
        cy.visit('/menu/global-options-public')
        cy.contains('button', 'Seleccionar opciones').should('be.visible')
    })
})
