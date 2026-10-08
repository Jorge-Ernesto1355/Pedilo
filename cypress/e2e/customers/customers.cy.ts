type TestCustomer = {
    id: string
    businessId: string
    name: string
    phone: string
    orderCount: number
    orders?: Array<{
        id: string
        orderNumber: number
        status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED'
        total: number
        createdAt: string
    }>
}

const businessId = 'business-customers-e2e'

function createCustomers(): TestCustomer[] {
    return [
        {
            id: 'customer-1',
            businessId,
            name: 'Ana García',
            phone: '6681234567',
            orderCount: 2,
            orders: [
                {
                    id: 'order-1',
                    orderNumber: 1,
                    status: 'READY',
                    total: 240,
                    createdAt: '2026-10-06T10:00:00.000Z',
                },
            ],
        },
        {
            id: 'customer-2',
            businessId,
            name: 'Luis Pérez',
            phone: '6697654321',
            orderCount: 0,
            orders: [],
        },
        {
            id: 'customer-3',
            businessId,
            name: 'María López',
            phone: '6671112233',
            orderCount: 1,
            orders: [],
        },
    ]
}

function installCustomerApi() {
    let customers = createCustomers()
    let nextId = 4

    cy.intercept(
        {
            method: 'GET',
            pathname: '/api/v1/businesses/*/customers',
        },
        (request) => {
            const url = new URL(request.url)
            const search = (url.searchParams.get('search') ?? '').toLowerCase()
            const page = Number(url.searchParams.get('page') ?? '1')
            const limit = Number(url.searchParams.get('limit') ?? '20')
            const filtered = customers.filter((customer) =>
                `${customer.name} ${customer.phone}`.toLowerCase().includes(search),
            )
            const start = (page - 1) * limit

            request.alias = 'listCustomers'
            request.reply({
                statusCode: 200,
                body: {
                    customers:
                        !search && page === 2
                            ? [customers[2]]
                            : filtered.slice(start, start + limit),
                    page,
                    limit,
                    total: search ? filtered.length : 21,
                },
            })
        },
    )

    cy.intercept('GET', '**/api/v1/businesses/customers/customer-1', {
        statusCode: 200,
        body: { customer: customers[0] },
    }).as('getCustomer')

    cy.intercept('POST', '**/api/v1/businesses/*/customers', (request) => {
        request.alias = 'createCustomer'
        const customer: TestCustomer = {
            id: `customer-${nextId++}`,
            businessId,
            name: request.body.name,
            phone: request.body.phone,
            orderCount: 0,
            orders: [],
        }
        customers.push(customer)
        request.reply({ statusCode: 201, body: { customer } })
    })

    cy.intercept('PATCH', '**/api/v1/businesses/customers/customer-1', (request) => {
        request.alias = 'updateCustomer'
        const customer = customers.find((item) => item.id === 'customer-1')!
        Object.assign(customer, request.body)
        request.reply({ statusCode: 200, body: { customer } })
    })

    cy.intercept('DELETE', '**/api/v1/businesses/customers/*', (request) => {
        request.alias = 'deleteCustomer'
        customers = customers.filter((customer) => customer.id !== 'customer-2')
        request.reply({ statusCode: 204, body: null })
    })
}

describe('Clientes · gestión completa', () => {
    beforeEach(() => {
        cy.login()
        installCustomerApi()
        cy.visit('/dashboard/customers')
        cy.wait('@listCustomers')
    })

    it('muestra Clientes en el navbar y carga el listado', () => {
        cy.get('a[href="/dashboard/customers"]').should('contain.text', 'Clientes')
        cy.get('a[href="/dashboard/customers"]').should('not.contain.text', 'Customers')
        cy.contains('Ana García').should('be.visible')
        cy.contains('6681234567').should('be.visible')
        cy.contains('2 pedidos').should('be.visible')
    })

    it('busca en backend y conserva el contrato de búsqueda', () => {
        cy.get('input[aria-label="Buscar clientes por nombre o teléfono"]').type('Luis')
        cy.wait('@listCustomers').then(({ request, response }) => {
            expect(request.url).to.include('search=Luis')
            expect(request.url).to.include('page=1')
            expect(request.url).to.include('limit=20')
            expect(response?.body.total).to.equal(1)
        })
        cy.contains('Luis Pérez').should('be.visible')
        cy.contains('Ana García').should('not.exist')
    })

    it('cambia de página usando page y total del backend', () => {
        cy.contains('Siguiente').click()
        cy.wait('@listCustomers').then(({ request }) => {
            expect(request.url).to.include('page=2')
            expect(request.url).to.include('limit=20')
        })
        cy.contains('María López').should('be.visible')
        cy.contains('Página 2 de 2').should('be.visible')
    })

    it('valida y crea un cliente con nombre y teléfono', () => {
        cy.contains('button', 'Nuevo cliente').click()
        cy.get('button[type="submit"]').click()
        cy.contains('El nombre es obligatorio').should('be.visible')
        cy.get('input[placeholder="Nombre"]').type('Cliente inválido')
        cy.get('input[placeholder="Teléfono"]').type('123')
        cy.get('button[type="submit"]').click()
        cy.contains('El teléfono debe contener exactamente 10 números').should('be.visible')

        cy.get('input[placeholder="Teléfono"]').clear().type('6629876543')
        cy.get('button[type="submit"]').click()
        cy.wait('@createCustomer').then(({ request }) => {
            expect(request.body).to.deep.equal({ name: 'Cliente inválido', phone: '6629876543' })
        })
        cy.wait('@listCustomers')
        cy.get('input[aria-label="Buscar clientes por nombre o teléfono"]').type('Cliente inválido')
        cy.wait('@listCustomers')
        cy.contains('Cliente inválido').should('be.visible')
    })

    it('abre el detalle y muestra los pedidos del cliente', () => {
        cy.contains('button', 'Ana García').click()
        cy.wait('@getCustomer')
        cy.contains('h2', 'Detalle del cliente').should('be.visible')
        cy.contains('Pedidos: 2').should('be.visible')
        cy.contains('Cargar pedidos').click()
        cy.contains('Pedido #1 · READY').should('be.visible')
        cy.contains('$240.00').should('be.visible')
    })

    it('edita los datos de un cliente y actualiza la lista', () => {
        cy.get('button[aria-label="Editar Ana García"]').click()
        cy.get('input[placeholder="Nombre"]').clear().type('Ana García Actualizada')
        cy.get('input[placeholder="Teléfono"]').clear().type('6689998877')
        cy.get('button[type="submit"]').click()
        cy.wait('@updateCustomer').then(({ request }) => {
            expect(request.body).to.deep.equal({
                name: 'Ana García Actualizada',
                phone: '6689998877',
            })
        })
        cy.wait('@listCustomers')
        cy.contains('Ana García Actualizada').should('be.visible')
    })

    it('elimina un cliente sin pedidos y refresca el listado', () => {
        cy.on('window:confirm', (message) => {
            expect(message).to.include('Luis Pérez')
            return true
        })
        cy.get('button[aria-label="Eliminar Luis Pérez"]').click()
        cy.wait('@deleteCustomer')
        cy.wait('@listCustomers')
        cy.contains('Luis Pérez').should('not.exist')
    })
})
