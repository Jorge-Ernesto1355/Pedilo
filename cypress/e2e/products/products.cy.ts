type Product = {
    id: string
    categoryId: string
    categoryName: string
    name: string
    description: string
    price: number
    imageUrl: string | null
    active: boolean
    isAvailable: boolean
    createdAt: string
    updatedAt: string
}

const categoryId = 'category-products-dashboard-e2e'

const initialProducts: Product[] = [
    {
        id: 'product-cafe-e2e',
        categoryId,
        categoryName: 'Bebidas',
        name: 'Café de olla',
        description: 'Café con canela',
        price: 45,
        imageUrl: null,
        active: true,
        isAvailable: true,
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
    },
    {
        id: 'product-cola-e2e',
        categoryId,
        categoryName: 'Bebidas',
        name: 'Coca Cola',
        description: 'Refresco frío',
        price: 35,
        imageUrl: null,
        active: true,
        isAvailable: true,
        createdAt: '2026-10-02T12:00:00.000Z',
        updatedAt: '2026-10-02T12:00:00.000Z',
    },
    {
        id: 'product-torta-e2e',
        categoryId,
        categoryName: 'Comida',
        name: 'Torta especial',
        description: 'Torta con aguacate',
        price: 120,
        imageUrl: null,
        active: false,
        isAvailable: false,
        createdAt: '2026-10-03T12:00:00.000Z',
        updatedAt: '2026-10-03T12:00:00.000Z',
    },
]

type ProductApiState = {
    products: Product[]
    failCatalog: boolean
    failAnalytics: boolean
    nextProductId: number
}

function statsFor(products: Product[]) {
    return {
        totalProducts: products.length,
        activeProducts: products.filter((product) => product.active).length,
        inactiveProducts: products.filter((product) => !product.active).length,
        uncategorizedProducts: 0,
        categoriesWithProducts: new Set(products.map((product) => product.categoryId)).size,
    }
}

function filteredProducts(products: Product[], requestUrl: string) {
    const url = new URL(requestUrl)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const active = url.searchParams.get('active')
    const category = url.searchParams.get('categoryId')
    const sortBy = url.searchParams.get('sortBy') ?? 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') ?? 'desc'

    return products
        .filter((product) => !search || product.name.toLowerCase().includes(search))
        .filter((product) => active === null || String(product.active) === active)
        .filter((product) => category === null || product.categoryId === category)
        .sort((left, right) => {
            const leftValue = sortBy === 'name' ? left.name : left.price
            const rightValue = sortBy === 'name' ? right.name : right.price
            const comparison = String(leftValue).localeCompare(String(rightValue), 'es')
            return sortOrder === 'asc' ? comparison : -comparison
        })
}

function installProductApi(state: ProductApiState) {
    cy.intercept('GET', '**/api/v1/businesses/mine/menus', {
        statusCode: 200,
        body: [
            {
                id: 'menu-products-dashboard-e2e',
                name: 'Menú E2E',
                description: null,
                isActive: true,
                categories: [
                    {
                        id: categoryId,
                        menuId: 'menu-products-dashboard-e2e',
                        name: 'Bebidas',
                        products: [],
                    },
                ],
            },
        ],
    })
    cy.intercept('GET', '**/api/v1/businesses/settings', {
        statusCode: 200,
        body: { currency: 'MXN' },
    })

    cy.intercept('GET', /\/api\/v1\/businesses\/[^/]+\/products(?:\/.*)?(?:\?.*)?$/, (request) => {
        const url = new URL(request.url)
        const path = url.pathname

        if (path.includes('/analytics/')) {
            if (state.failAnalytics) {
                request.reply({ statusCode: 500, body: { message: 'analytics unavailable' } })
                return
            }
            if (path.endsWith('/best-selling')) request.alias = 'bestSelling'
            if (path.endsWith('/most-requested')) request.alias = 'mostRequested'
            if (path.endsWith('/summary')) request.alias = 'productSummary'
            if (path.endsWith('/summary'))
                request.reply({ statusCode: 200, body: statsFor(state.products) })
            else {
                const ranking = [
                    {
                        productId: 'product-cafe-e2e',
                        productName: 'Café de olla',
                        soldQuantity: 12,
                        orderCount: 8,
                        revenue: 540,
                    },
                    {
                        productId: 'product-cola-e2e',
                        productName: 'Coca Cola',
                        requestedQuantity: 10,
                        orderCount: 7,
                    },
                ]
                request.reply({ statusCode: 200, body: ranking })
            }
            return
        }

        if (path.endsWith('/stats')) {
            request.alias = 'productStats'
            request.reply({ statusCode: 200, body: statsFor(state.products) })
            return
        }

        request.alias = 'productList'
        if (state.failCatalog) {
            request.reply({ statusCode: 500, body: { message: 'catalog unavailable' } })
            return
        }
        const products = filteredProducts(state.products, request.url)
        const page = Number(url.searchParams.get('page') ?? 1)
        const limit = Number(url.searchParams.get('limit') ?? 10)
        request.reply({
            statusCode: 200,
            body: {
                products: products.slice((page - 1) * limit, page * limit),
                page,
                limit,
                total: products.length,
            },
        })
    })

    cy.intercept('GET', '**/api/v1/businesses/products/*', (request) => {
        request.alias = 'productDetail'
        const productId = request.url.split('/').pop()
        request.reply({
            statusCode: 200,
            body: state.products.find((product) => product.id === productId),
        })
    })

    cy.intercept('POST', '**/api/v1/businesses/*/products', (request) => {
        request.alias = 'createProduct'
        const product: Product = {
            ...initialProducts[0],
            id: `product-created-${state.nextProductId++}`,
            name: 'Producto creado E2E',
            description: 'Producto nuevo',
            price: 75,
            active: true,
            isAvailable: true,
        }
        state.products.push(product)
        request.reply({ statusCode: 201, body: product })
    })

    cy.intercept('PATCH', '**/api/v1/businesses/products/*/status', (request) => {
        request.alias = 'toggleProduct'
        const productId = request.url.split('/').at(-2)
        const product = state.products.find((item) => item.id === productId)
        if (!product) return request.reply({ statusCode: 404, body: {} })
        product.active = Boolean(request.body.active)
        product.isAvailable = product.active
        request.reply({ statusCode: 200, body: product })
    })

    cy.intercept('PATCH', '**/api/v1/businesses/products/*', (request) => {
        if (request.url.endsWith('/status')) {
            request.alias = 'toggleProduct'
            const productId = request.url.split('/').at(-2)
            const product = state.products.find((item) => item.id === productId)
            if (!product) return request.reply({ statusCode: 404, body: {} })
            product.active = Boolean(request.body.active)
            product.isAvailable = product.active
            request.reply({ statusCode: 200, body: product })
            return
        }

        request.alias = 'updateProduct'
        const productId = request.url.split('/').pop()
        const product = state.products.find((item) => item.id === productId)
        if (!product) return request.reply({ statusCode: 404, body: {} })
        request.reply({ statusCode: 200, body: product })
    })

    cy.intercept('DELETE', '**/api/v1/businesses/products/*', (request) => {
        request.alias = 'deleteProduct'
        const productId = request.url.split('/').pop()
        state.products = state.products.filter((product) => product.id !== productId)
        request.reply({ statusCode: 204, body: null })
    })
}

function visitProducts(state: ProductApiState) {
    cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
        if (!e2eSeedEmail || !e2eSeedPassword) {
            throw new Error(
                'Configura E2E_SEED_EMAIL y E2E_SEED_PASSWORD o ejecuta npm run e2e:seed antes de probar Productos.',
            )
        }
        cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
        cy.then(() => installProductApi(state))
        cy.visit('/dashboard/products')
        cy.wait([
            '@productList',
            '@productStats',
            '@bestSelling',
            '@mostRequested',
            '@productSummary',
        ])
    })
}

function cardValue(label: string) {
    return cy.contains('p', label).parent().find('p').last()
}

describe('Productos · catálogo, métricas y analytics', () => {
    it('muestra total, activos, inactivos, categorías y rankings', () => {
        const state: ProductApiState = {
            products: structuredClone(initialProducts),
            failCatalog: false,
            failAnalytics: false,
            nextProductId: 1,
        }
        visitProducts(state)

        cardValue('Total de productos').should('contain', '3')
        cardValue('Activos').should('contain', '2')
        cardValue('Inactivos').should('contain', '1')
        cardValue('Sin categoría').should('contain', '0')
        cardValue('Categorías con productos').should('contain', '1')
        cy.contains('h2', 'Todos tus productos').should('be.visible')
        cy.contains('Café de olla').should('be.visible')
        cy.contains('Torta especial').should('be.visible')
        cy.contains('h2', 'Qué están pidiendo tus clientes').should('be.visible')
        cy.contains('h3', 'Más vendidos').parent().should('contain', 'Café de olla')
        cy.contains('h3', 'Más solicitados').parent().should('contain', 'Coca Cola')
    })

    it('aplica búsqueda, estado, categoría y ordenamiento enviando los parámetros correctos', () => {
        const state: ProductApiState = {
            products: structuredClone(initialProducts),
            failCatalog: false,
            failAnalytics: false,
            nextProductId: 1,
        }
        visitProducts(state)

        cy.get('input[placeholder="Buscar por nombre…"]').type('C')
        cy.wait('@productList').its('request.url').should('include', 'search=C')
        cy.contains('Café de olla').should('be.visible')
        cy.contains('Coca Cola').should('be.visible')

        cy.get('input[placeholder="Buscar por nombre…"]').clear()
        cy.wait('@productList')
        cy.contains('span', 'Estado').parent().find('select').select('false')
        cy.wait('@productList').its('request.url').should('include', 'active=false')
        cy.contains('Torta especial').should('be.visible')
        cy.contains('Café de olla').should('not.exist')

        cy.contains('span', 'Categoría').parent().find('select').select(categoryId)
        cy.wait('@productList').its('request.url').should('include', `categoryId=${categoryId}`)
        cy.contains('span', 'Ordenar por').parent().find('select').select('price')
        cy.wait('@productList').its('request.url').should('include', 'sortBy=price')
        cy.contains('span', 'Ordenar por').parent().find('button').click()
        cy.wait('@productList').its('request.url').should('include', 'sortOrder=asc')
    })

    it('permite ver detalle, crear, editar, activar y eliminar un producto', () => {
        const state: ProductApiState = {
            products: structuredClone(initialProducts),
            failCatalog: false,
            failAnalytics: false,
            nextProductId: 1,
        }
        visitProducts(state)

        cy.get('button[aria-label="Ver Café de olla"]').click()
        cy.wait('@productDetail')
        cy.get('[role="dialog"]').should('contain', 'Café de olla').and('contain', '$45.00')
        cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()

        cy.get('button[aria-label="Editar Café de olla"]').click()
        cy.get('[role="dialog"]').within(() => {
            cy.contains('label', 'Nombre del producto').find('input').clear().type('Café grande')
            cy.contains('label', 'Precio').find('input').clear().type('55')
            cy.contains('button', 'Guardar cambios').click()
        })
        cy.wait('@updateProduct')
        cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()

        cy.contains('button', 'Activo').click()
        cy.wait('@toggleProduct').its('request.body.active').should('eq', false)
        cy.contains('button', 'Inactivo').should('be.visible')

        cy.contains('button', 'Nuevo producto').click()
        cy.get('[role="dialog"]').within(() => {
            cy.contains('label', 'Nombre del producto').find('input').type('Producto nuevo')
            cy.contains('label', 'Precio').find('input').type('75')
            cy.contains('button', 'Crear producto').click()
        })
        cy.wait('@createProduct')
        cy.get('[role="dialog"]').should('contain', 'Editar producto')
        cy.get('[role="dialog"] button[aria-label="Cerrar"]').click()
        cy.contains('Producto creado E2E').should('be.visible')

        cy.on('window:confirm', () => true)
        cy.get('button[aria-label="Eliminar Producto creado E2E"]').click()
        cy.wait('@deleteProduct')
        cy.contains('Producto creado E2E').should('not.exist')
    })

    it('envía filtros de fecha y límite de analytics y muestra error de analytics', () => {
        const state: ProductApiState = {
            products: structuredClone(initialProducts),
            failCatalog: false,
            failAnalytics: false,
            nextProductId: 1,
        }
        visitProducts(state)

        cy.contains('span', 'Desde').parent().find('input').type('2026-10-01')
        cy.wait('@bestSelling').its('request.url').should('include', 'from=2026-10-01')
        cy.contains('span', 'Hasta').parent().find('input').type('2026-10-31')
        cy.wait('@mostRequested').its('request.url').should('include', 'to=2026-10-31')
        cy.contains('span', 'Límite').parent().find('select').select('10')
        cy.wait('@productSummary').its('request.url').should('include', 'limit=10')

        state.failAnalytics = true
        cy.contains('span', 'Límite').parent().find('select').select('20')
        cy.wait('@bestSelling')
        cy.contains('No pudimos cargar los analytics de productos.').should('be.visible')
    })

    it('muestra el estado vacío cuando el catálogo no tiene productos', () => {
        const state: ProductApiState = {
            products: [],
            failCatalog: false,
            failAnalytics: false,
            nextProductId: 1,
        }
        visitProducts(state)
        cy.contains('Aún no tienes productos').should('be.visible')
        cy.contains('Crear producto').should('be.visible')
        cardValue('Total de productos').should('contain', '0')
        cardValue('Activos').should('contain', '0')
    })
})

export {}
