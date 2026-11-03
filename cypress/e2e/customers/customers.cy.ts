type TestCustomer = {
    id: string
    businessId: string
    name: string
    phone: string
    isDisabled?: boolean
    orderCount: number
    totalSpent: number
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
            totalSpent: 240,
            isDisabled: false,
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
            totalSpent: 0,
            isDisabled: false,
            orders: [],
        },
        {
            id: 'customer-3',
            businessId,
            name: 'María López',
            phone: '6671112233',
            orderCount: 1,
            totalSpent: 120,
            isDisabled: false,
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
            const limit = Number(url.searchParams.get('limit') ?? '10')
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

    cy.intercept('GET', '**/api/v1/businesses/customers/customer-1/orders*', {
        statusCode: 200,
        body: {
            orders: [
                {
                    id: 'order-1',
                    orderNumber: 1,
                    status: 'READY',
                    total: 240,
                    subtotal: 240,
                    discountAmount: 0,
                    notes: null,
                    fulfillmentType: 'DINE_IN',
                    createdAt: '2026-10-06T10:00:00.000Z',
                    items: [],
                },
            ],
            page: 1,
            limit: 10,
            total: 1,
        },
    }).as('getCustomerOrders')

    cy.intercept('POST', '**/api/v1/businesses/*/customers', (request) => {
        request.alias = 'createCustomer'
        const customer: TestCustomer = {
            id: `customer-${nextId++}`,
            businessId,
            name: request.body.name,
            phone: request.body.phone,
            orderCount: 0,
            totalSpent: 0,
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

    cy.intercept('PATCH', '**/api/v1/businesses/customers/customer-1/status', (request) => {
        request.alias = 'toggleCustomerStatus'
        const customer = customers.find((item) => item.id === 'customer-1')!
        customer.isDisabled = request.body.disabled
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
        cy.contains('Ana García')
            .closest('div.flex.flex-col')
            .should('contain', 'Pedidos')
            .and('contain', '2')
    })

    it('busca en backend y conserva el contrato de búsqueda', () => {
        cy.get('input[aria-label="Buscar clientes por nombre o teléfono"]').type('Luis')
        cy.wait('@listCustomers').then(({ request, response }) => {
            expect(request.url).to.include('search=Luis')
            expect(request.url).to.include('page=1')
            expect(request.url).to.include('limit=10')
            expect(response?.body.total).to.equal(1)
        })
        cy.contains('Luis Pérez').should('be.visible')
        cy.contains('Ana García').should('not.exist')
    })

    it('cambia de página usando page y total del backend', () => {
        cy.contains('Siguiente').click()
        cy.wait('@listCustomers').then(({ request }) => {
            expect(request.url).to.include('page=2')
            expect(request.url).to.include('limit=10')
        })
        cy.contains('María López').should('be.visible')
        cy.contains('Página 2 de 3').should('be.visible')
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

    it('limita el nombre de un cliente nuevo a 20 caracteres', () => {
        cy.contains('button', 'Nuevo cliente').click()
        cy.get('input[placeholder="Nombre"]')
            .type('Nombre de cliente con más de veinte caracteres')
            .invoke('val')
            .should('have.length', 20)
        cy.get('input[placeholder="Nombre"]')
            .and('have.attr', 'maxlength', '20')
        cy.get('#customer-name-counter').should('contain', '20/20')
        cy.get('input[placeholder="Teléfono"]').type('6629876543')
        cy.get('button[type="submit"]').click()
        cy.wait('@createCustomer').its('request.body.name').should('have.length', 20)
    })

    it('muestra una sola vez el error cuando el teléfono ya pertenece a otro cliente', () => {
        cy.intercept('POST', '**/api/v1/businesses/*/customers', {
            statusCode: 409,
            body: { error: { code: 'CUSTOMER_PHONE_ALREADY_EXISTS' } },
        }).as('duplicateCustomer')

        cy.contains('button', 'Nuevo cliente').click()
        cy.get('input[placeholder="Nombre"]').type('Cliente duplicado')
        cy.get('input[placeholder="Teléfono"]').type('6681234567')
        cy.get('button[type="submit"]').click()
        cy.wait('@duplicateCustomer')
        cy.contains('Este teléfono ya pertenece a otro cliente de este negocio.')
            .should('be.visible')
            .parents('[role="dialog"], form')
            .first()
            .find('[role="alert"]')
            .should('have.length', 1)
    })

    it('abre el detalle y muestra los pedidos del cliente', () => {
        cy.contains('button', 'Ana García').click()
        cy.wait('@getCustomer')
        cy.get('[role="dialog"][aria-label="Detalle del cliente"]').should('be.visible')
        cy.contains('Pedidos: 2').should('be.visible')
        cy.contains('Cargar pedidos').click()
        cy.contains('Pedido #1').should('be.visible')
        cy.contains('READY').should('be.visible')
        cy.contains('$240.00').should('be.visible')
    })

    it('edita los datos de un cliente y actualiza la lista', () => {
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Editar cliente').click()
        cy.get('input[placeholder="Nombre"]').clear().type('Ana García Actualizada')
        cy.get('input[placeholder="Teléfono"]').clear().type('6689998877')
        cy.get('button[type="submit"]').click()
        cy.wait('@updateCustomer').then(({ request }) => {
            expect(request.body).to.deep.equal({
                name: 'Ana García Actualiza',
                phone: '6689998877',
            })
        })
        cy.wait('@listCustomers')
        cy.contains('Ana García Actualiza').should('be.visible')
    })

    it('elimina un cliente sin pedidos y refresca el listado', () => {
        cy.on('window:confirm', (message) => {
            expect(message).to.include('Luis Pérez')
            return true
        })
        cy.get('button[aria-label="Acciones de Luis Pérez"]').click()
        cy.contains('[role="menuitem"]', 'Eliminar cliente').click()
        cy.wait('@deleteCustomer')
        cy.wait('@listCustomers')
        cy.contains('Luis Pérez').should('not.exist')
    })

    it('ofrece enviar WhatsApp desde el menú de acciones del cliente', () => {
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Editar cliente').should('be.visible')
        cy.contains('[role="menuitem"]', 'Eliminar cliente').should('be.visible')
        cy.get('a[aria-label="Enviar WhatsApp a Ana García"]')
            .should('have.attr', 'href', 'https://wa.me/526681234567')
            .and('have.attr', 'target', '_blank')
    })

    it('muestra la opción compacta para deshabilitar debajo de editar cliente', () => {
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.get('[role="menuitem"]').then(($items) => {
            const labels = [...$items].map((item) => item.textContent?.replace(/\s+/g, ' ').trim())
            expect(labels.findIndex((label) => label?.includes('Editar cliente'))).to.be.lessThan(
                labels.findIndex((label) => label?.includes('Deshabilitar cliente')),
            )
        })
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente')
            .should('contain.text', 'Ya no podrá hacer pedidos')
    })

    it('deshabilita un cliente, cierra el popover y envía el estado al backend', () => {
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').click()
        cy.wait('@toggleCustomerStatus').its('request.body').should('deep.equal', { disabled: true })
        cy.wait('@listCustomers')
        cy.contains('Cliente deshabilitado').should('be.visible')
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').should('not.exist')
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Habilitar cliente')
            .should('contain.text', 'Podrá volver a hacer pedidos')
    })

    it('evita solicitudes duplicadas mientras se guarda el cambio', () => {
        let calls = 0
        cy.intercept('PATCH', '**/api/v1/businesses/customers/customer-1/status', (request) => {
            calls += 1
            request.alias = 'delayedCustomerStatus'
            request.reply({
                delay: 300,
                statusCode: 200,
                body: { customer: { ...createCustomers()[0], isDisabled: true } },
            })
        })
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').click()
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').should('be.disabled')
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').click({ force: true })
        cy.wait('@delayedCustomerStatus')
        cy.then(() => expect(calls).to.equal(1))
    })

    it('conserva el cliente y muestra error si no puede cambiar el estado', () => {
        cy.intercept('PATCH', '**/api/v1/businesses/customers/customer-1/status', {
            statusCode: 500,
            body: { error: { code: 'INTERNAL_ERROR', message: 'No disponible' } },
        }).as('failedCustomerStatus')
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Deshabilitar cliente').click()
        cy.wait('@failedCustomerStatus')
        cy.contains('No se pudo actualizar el cliente').should('be.visible')
        cy.contains('Ana García').should('be.visible')
    })

    it('cierra el popover al hacer clic fuera', () => {
        cy.get('button[aria-label="Acciones de Ana García"]').click()
        cy.contains('[role="menuitem"]', 'Editar cliente').should('be.visible')
        cy.get('h1').click()
        cy.contains('[role="menuitem"]', 'Editar cliente').should('not.exist')
        cy.contains('[role="menuitem"]', 'Eliminar cliente').should('not.exist')
    })
})
