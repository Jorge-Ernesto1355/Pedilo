type SearchOrderStatus = 'PENDING' | 'PREPARING' | 'READY'

const orders = [
    {
        id: 'order-search-1024',
        orderNumber: 1024,
        status: 'PENDING' as const,
        customerId: 'customer-search-jorge',
        subtotal: 89,
        total: 89,
        customerName: 'Jorge López',
        customerPhone: '668-123-4567',
        notes: null,
        items: [
            {
                id: 'item-search-1024',
                productId: 'product-taco',
                productName: 'Taco de asada',
                quantity: 1,
                unitPrice: 89,
                subtotal: 89,
                options: [],
            },
        ],
        statusHistory: [],
        createdAt: '2026-10-04T18:20:00.000Z',
        updatedAt: '2026-10-04T18:20:00.000Z',
    },
    {
        id: 'order-search-1025',
        orderNumber: 1025,
        status: 'PREPARING' as const,
        customerId: 'customer-search-jorge',
        subtotal: 149,
        total: 149,
        customerName: 'Jorge Martínez',
        customerPhone: '668-123-4567',
        notes: null,
        items: [
            {
                id: 'item-search-1025',
                productId: 'product-burger',
                productName: 'Hamburguesa especial',
                quantity: 1,
                unitPrice: 149,
                subtotal: 149,
                options: [],
            },
        ],
        statusHistory: [],
        createdAt: '2026-10-04T18:21:00.000Z',
        updatedAt: '2026-10-04T18:21:00.000Z',
    },
    {
        id: 'order-search-1026',
        orderNumber: 1026,
        status: 'READY' as const,
        customerId: 'customer-search-ana',
        subtotal: 55,
        total: 55,
        customerName: 'Ana García',
        customerPhone: '667-555-0101',
        notes: null,
        items: [
            {
                id: 'item-search-1026',
                productId: 'product-flan',
                productName: 'Flan de vainilla',
                quantity: 1,
                unitPrice: 55,
                subtotal: 55,
                options: [],
            },
        ],
        statusHistory: [],
        createdAt: '2026-10-04T18:22:00.000Z',
        updatedAt: '2026-10-04T18:22:00.000Z',
    },
]

function normalizePhone(value: string) {
    return value.replace(/\D/g, '')
}

function installSearchApi() {
    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-search-e2e',
            businessId: 'business-search-e2e',
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
            createdAt: '2026-10-04T18:00:00.000Z',
            updatedAt: '2026-10-04T18:00:00.000Z',
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
        const status = url.searchParams.get('status') as SearchOrderStatus | null
        const normalizedSearch = normalizePhone(search)
        const hasPhoneSearch = normalizedSearch.length >= 7 && /^\d+$/.test(normalizedSearch)
        const filteredOrders = orders.filter((order) => {
            const matchesStatus = !status || order.status === status
            const matchesSearch =
                !search ||
                String(order.orderNumber) === search ||
                order.id === search ||
                order.customerName.toLowerCase().includes(search) ||
                (hasPhoneSearch && normalizePhone(order.customerPhone).includes(normalizedSearch))
            return matchesStatus && matchesSearch
        })

        if (status && search) request.alias = 'searchAndStatusOrders'
        else if (status) request.alias = 'statusOrders'
        else if (search) request.alias = 'searchOrders'
        else request.alias = 'allOrders'

        request.reply({
            statusCode: 200,
            body: { orders: filteredOrders, page: 1, limit: 20, total: filteredOrders.length },
        })
    })
}

function searchInput() {
    return cy.get('input[aria-label="Buscar pedidos por número, nombre o teléfono"]')
}

function enterSearch(value: string) {
    searchInput().then(($input) => {
        if ($input.val()) cy.wrap($input).clear()
    })
    cy.wait(400)
    searchInput().should('exist').and('not.be.disabled').type(value)
}

function assertVisibleOrderNumbers(expected: string[]) {
    cy.get('article').should(($articles) => {
        const actual = [...$articles].map(
            (article) => article.textContent?.match(/Pedido #(\d{4})/)?.[1],
        )
        expect(actual).to.deep.equal(expected)
    })
}

describe('Búsqueda de órdenes', () => {
    beforeEach(() => {
        cy.login()
        cy.then(installSearchApi)
        cy.visit('/dashboard/orders')
        cy.wait('@allOrders')
    })

    it('busca por número exacto y por nombre sin distinguir mayúsculas', () => {
        enterSearch('1024')
        cy.wait('@searchOrders').its('request.url').should('include', 'search=1024')
        cy.get('article').should('have.length', 1).and('contain', 'Pedido #1024')

        enterSearch('Jorge')
        cy.wait('@searchOrders')
        assertVisibleOrderNumbers(['1024', '1025'])

        enterSearch('jorge')
        cy.wait('@searchOrders')
        assertVisibleOrderNumbers(['1024', '1025'])

        enterSearch('JORGE')
        cy.wait('@searchOrders')
        assertVisibleOrderNumbers(['1024', '1025'])

        enterSearch('JoRgE')
        cy.wait('@searchOrders')
        assertVisibleOrderNumbers(['1024', '1025'])
    })

    it('busca por teléfono normalizado y muestra vacío cuando no hay resultados', () => {
        enterSearch('6681234567')
        cy.wait('@searchOrders').its('request.url').should('include', 'search=6681234567')
        assertVisibleOrderNumbers(['1024', '1025'])

        enterSearch('668-123-4567')
        cy.wait('@searchOrders').its('request.url').should('include', 'search=668-123-4567')
        assertVisibleOrderNumbers(['1024', '1025'])

        enterSearch('cliente-inexistente')
        cy.wait('@searchOrders')
        cy.contains('No encontramos pedidos').should('be.visible')
        cy.contains('Prueba con otro número, nombre o teléfono.').should('be.visible')
    })

    it('limpia la búsqueda y combina search con el filtro de estado', () => {
        enterSearch('Jorge')
        cy.wait('@searchOrders')
        assertVisibleOrderNumbers(['1024', '1025'])

        cy.get('button[aria-label="Limpiar búsqueda"]').click()
        cy.wait('@allOrders')
        searchInput().should('have.value', '')
        cy.get('article').should('have.length', 3)

        cy.get('select[aria-label="Filtrar pedidos por estado"]').select('PREPARING')
        cy.wait('@statusOrders').its('request.url').should('include', 'status=PREPARING')
        cy.get('article').should('have.length', 1).and('contain', 'Pedido #1025')

        enterSearch('Jorge')
        cy.wait('@searchAndStatusOrders').then(({ request }) => {
            expect(request.url).to.include('search=Jorge')
            expect(request.url).to.include('status=PREPARING')
        })
        cy.get('article').should('have.length', 1).and('contain', 'Pedido #1025')
        cy.get('article').should('not.contain', 'Pedido #1024')
    })
})

export {}
