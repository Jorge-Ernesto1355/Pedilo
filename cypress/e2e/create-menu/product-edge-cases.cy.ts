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
}

type CatalogState = {
    products: Product[]
    nextProductId: number
    createRequests: number
    rejectLargePrice: boolean
    deleteError: boolean
}

const businessId = 'business-product-edge-e2e'
const menuId = 'menu-product-edge-e2e'
const categoryId = 'category-product-edge-e2e'

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

function productFromRequest(state: CatalogState, body: unknown): Product {
    const productNumber = state.nextProductId++
    return {
        id: `product-product-edge-${productNumber}`,
        categoryId,
        name: requestField(body, 'name', `Producto ${productNumber}`),
        description: requestField(body, 'description', ''),
        price: Number(requestField(body, 'price', '0')),
        imageUrl: null,
        isAvailable: true,
        active: true,
        sortOrder: state.products.length,
    }
}

function installBusinessApi(state: CatalogState) {
    cy.intercept('GET', '**/api/v1/businesses/mine', {
        statusCode: 200,
        body: {
            business: {
                id: businessId,
                name: 'Negocio de productos E2E',
                slug: 'negocio-productos-e2e',
                description: 'Negocio para probar productos.',
                ubication: 'Culiacán, Sinaloa',
                businessSchedule: null,
            },
        },
    })

    cy.intercept('GET', '**/api/v1/businesses/mine/menus', (request) => {
        request.alias = 'listMenus'
        request.reply({
            statusCode: 200,
            body: [
                {
                    id: menuId,
                    name: 'Menú de pruebas',
                    description: 'Menú para casos límite.',
                    isActive: true,
                    categories: [
                        {
                            id: categoryId,
                            menuId,
                            name: 'Bebidas',
                            description: null,
                            isActive: true,
                            sortOrder: 0,
                            products: [],
                        },
                    ],
                },
            ],
        })
    })

    cy.intercept('GET', `**/api/v1/businesses/menus/${menuId}`, (request) => {
        request.alias = 'getMenu'
        request.reply({
            statusCode: 200,
            body: {
                id: menuId,
                name: 'Menú de pruebas',
                description: 'Menú para casos límite.',
                isActive: true,
                categories: [
                    {
                        id: categoryId,
                        menuId,
                        name: 'Bebidas',
                        description: null,
                        isActive: true,
                        sortOrder: 0,
                        products: [],
                    },
                ],
            },
        })
    })

    cy.intercept('GET', `**/api/v1/businesses/categories/${categoryId}/products`, (request) => {
        request.alias = 'listProducts'
        request.reply({ statusCode: 200, body: state.products })
    })

    cy.intercept('GET', '**/api/v1/businesses/products/*', (request) => {
        const productId = request.url.split('/').pop()
        request.reply({
            statusCode: 200,
            body: state.products.find((product) => product.id === productId) ?? null,
        })
    })

    cy.intercept('POST', '**/api/v1/businesses/*/products', (request) => {
        request.alias = 'createProduct'
        state.createRequests += 1
        const price = Number(requestField(request.body, 'price', '0'))
        if (state.rejectLargePrice && price > 10_000_000) {
            request.reply({
                statusCode: 400,
                body: {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Price must be less than or equal to 10000000',
                    },
                },
            })
            return
        }

        const product = productFromRequest(state, request.body)
        state.products.push(product)
        request.reply({ statusCode: 201, body: product })
    })

    cy.intercept('PATCH', '**/api/v1/businesses/products/*', (request) => {
        request.alias = 'updateProduct'
        const productId = request.url.split('/').pop()
        const product = state.products.find((item) => item.id === productId)
        if (!product) {
            request.reply({ statusCode: 404, body: { error: { code: 'PRODUCT_NOT_FOUND' } } })
            return
        }
        product.name = requestField(request.body, 'name', product.name)
        product.description = requestField(request.body, 'description', product.description)
        product.price = Number(requestField(request.body, 'price', String(product.price)))
        request.reply({ statusCode: 200, body: product })
    })

    cy.intercept('PATCH', '**/api/v1/businesses/products/*/status', (request) => {
        request.alias = 'updateProductStatus'
        const productId = request.url.split('/').at(-2)
        const product = state.products.find((item) => item.id === productId)
        if (!product) {
            request.reply({ statusCode: 404, body: { error: { code: 'PRODUCT_NOT_FOUND' } } })
            return
        }
        product.isAvailable = Boolean(request.body.active)
        product.active = product.isAvailable
        request.reply({ statusCode: 200, body: product })
    })

    cy.intercept('DELETE', '**/api/v1/businesses/products/*', (request) => {
        request.alias = 'deleteProduct'
        if (state.deleteError) {
            request.reply({
                statusCode: 409,
                body: {
                    error: {
                        code: 'PRODUCT_HAS_ORDERS',
                        message: 'Product cannot be deleted because it has orders',
                    },
                },
            })
            return
        }
        const productId = request.url.split('/').pop()
        state.products = state.products.filter((product) => product.id !== productId)
        request.reply({ statusCode: 204, body: null })
    })
}

function openCatalog() {
    cy.visit('/create-menu')
    cy.wait('@listMenus')
    cy.contains('button', 'Menú de pruebas').click()
    cy.wait('@getMenu')
    cy.contains('button', 'Agregar producto').should('be.visible')
}

function openProductModal() {
    cy.contains('button', 'Agregar producto').click()
    cy.get('[role="dialog"]').should('contain', 'Agregar producto')
}

function closeProductModal() {
    cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
    cy.get('[role="dialog"]').should('not.exist')
}

function submitProduct(name: string, price: string, description = '') {
    cy.get('#product-name').clear().type(name)
    cy.get('#product-description').clear()
    if (description) cy.get('#product-description').type(description)
    cy.get('#product-price').clear().type(price)
    cy.get('[role="dialog"] button[type="submit"]').contains('Crear producto').click()
}

describe('Productos · casos límite del catálogo', () => {
    beforeEach(() => cy.login())

    it('valida nombre, descripción y precio sin enviar datos inválidos', () => {
        const state: CatalogState = {
            products: [],
            nextProductId: 1,
            createRequests: 0,
            rejectLargePrice: true,
            deleteError: false,
        }
        installBusinessApi(state)
        openCatalog()

        openProductModal()
        cy.get('#product-price').type('50')
        cy.get('[role="dialog"] button[type="submit"]').contains('Crear producto').click()
        cy.contains('Escribe el nombre del producto.').should('be.visible')
        cy.then(() => expect(state.createRequests).to.eq(0))
        closeProductModal()

        openProductModal()
        submitProduct('X', '50')
        cy.wait('@createProduct')
        closeProductModal()
        cy.contains('X').should('be.visible')

        openProductModal()
        submitProduct('Precio cero', '0')
        cy.contains('Usa un precio mayor que cero con máximo 2 decimales.').should('be.visible')
        closeProductModal()

        openProductModal()
        cy.get('#product-name').type('Precio negativo')
        cy.get('#product-price').type('-50')
        cy.get('#product-price').should('have.value', '50')
        cy.get('[role="dialog"] button[type="submit"]').contains('Crear producto').click()
        cy.wait('@createProduct')
        closeProductModal()

        openProductModal()
        cy.get('#product-name').type('Decimales')
        cy.get('#product-price').type('12.345')
        cy.get('#product-price').should('have.value', '12.34')
        cy.get('[role="dialog"] button[type="submit"]').contains('Crear producto').click()
        cy.wait('@createProduct')
        closeProductModal()

        openProductModal()
        submitProduct('Nombre demasiado largo'.repeat(6), '20')
        cy.contains('Usa 80 caracteres o menos.').should('be.visible')
        closeProductModal()

        openProductModal()
        submitProduct('Descripción enorme', '20', 'D'.repeat(181))
        cy.contains('Usa 180 caracteres o menos.').should('be.visible')
        closeProductModal()

        openProductModal()
        submitProduct('Precio muy grande', '10000000.01')
        cy.wait('@createProduct')
        cy.contains('No se pudo guardar el producto').should('be.visible')
        cy.contains(
            'Algunos datos no son válidos. Revisa los campos marcados e inténtalo nuevamente.',
        ).should('be.visible')
        cy.contains('Price must be less').should('not.exist')
        closeProductModal()
    })

    it('crea, edita, desactiva y elimina productos, incluyendo nombres similares', () => {
        const state: CatalogState = {
            products: [],
            nextProductId: 1,
            createRequests: 0,
            rejectLargePrice: false,
            deleteError: false,
        }
        installBusinessApi(state)
        openCatalog()

        ;['Coca Cola', 'coca cola', 'Coca-Cola'].forEach((name) => {
            openProductModal()
            submitProduct(name, '25')
            cy.wait('@createProduct')
            closeProductModal()
        })
        cy.contains('Coca Cola').should('be.visible')
        cy.contains('coca cola').should('be.visible')
        cy.contains('Coca-Cola').should('be.visible')
        cy.contains('3 productos').should('be.visible')

        cy.get('button[aria-label="Editar Coca Cola"]').click()
        cy.get('#product-name').should('have.value', 'Coca Cola')
        cy.get('#product-price').clear().type('30')
        cy.get('[role="dialog"] button[type="submit"]').contains('Guardar cambios').click()
        cy.wait('@updateProduct')
        closeProductModal()
        cy.contains('$30.00').should('be.visible')

        cy.get('button[aria-label="Editar Coca Cola"]').click()
        closeProductModal()
        cy.contains('button', 'Disponible').click()
        cy.wait('@updateProductStatus')
        cy.contains('button', 'No disponible').should('be.visible')

        cy.on('window:confirm', () => true)
        cy.get('button[aria-label="Eliminar Coca-Cola"]').click()
        cy.wait('@deleteProduct')
        cy.contains('Coca-Cola').should('not.exist')
    })

    it('no muestra controles de producto sin menú o sin categoría', () => {
        cy.intercept('GET', '**/api/v1/businesses/mine', {
            statusCode: 200,
            body: { business: { id: businessId, name: 'Negocio E2E' } },
        })
        let menus: unknown[] = []
        cy.intercept('GET', '**/api/v1/businesses/mine/menus', (request) => {
            request.reply({ statusCode: 200, body: menus })
        })
        cy.intercept('GET', `**/api/v1/businesses/menus/${menuId}`, {
            statusCode: 200,
            body: {
                id: menuId,
                name: 'Menú vacío',
                description: null,
                isActive: true,
                categories: [],
            },
        }).as('getEmptyMenu')
        cy.visit('/create-menu')
        cy.contains('button', 'Crear menú').should('be.visible')
        cy.contains('button', 'Agregar producto').should('not.exist')

        menus = [
            {
                id: menuId,
                name: 'Menú vacío',
                description: null,
                isActive: true,
                categories: [],
            },
        ]
        cy.reload()
        cy.contains('button', 'Menú vacío').click()
        cy.wait('@getEmptyMenu')
        cy.contains('button', 'Agregar').should('be.visible')
        cy.contains('button', 'Agregar producto').should('not.exist')
    })
})

export {}
