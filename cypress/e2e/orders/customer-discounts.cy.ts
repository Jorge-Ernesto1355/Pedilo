type DiscountStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED' | 'CANCELLED'

const createdAt = '2026-10-31T18:00:00.000Z'
const businessId = 'business-realtime-discount-options-e2e'
const publicSlug = 'cypress-descuentos-e2e'
const publicProductId = 'product-discount-checkout-e2e'
const checkoutCustomerName = 'Cliente Cypress fide'
const order = {
    id: 'order-customer-discount-e2e',
    orderNumber: 6382,
    customerId: 'customer-realtime-discount-options-e2e',
    status: 'READY' as const,
    source: 'PUBLIC' as const,
    fulfillmentType: 'PICKUP' as const,
    subtotal: 240,
    discountAmount: 0,
    total: 240,
    customerName: 'Cliente Cypress fidelizado',
    customerPhone: '668-123-4567',
    notes: null,
    items: [
        {
            id: 'order-item-customer-discount-e2e',
            productId: 'product-customer-discount-e2e',
            productName: 'Combo de la casa',
            quantity: 1,
            unitPrice: 240,
            subtotal: 240,
            options: [],
        },
    ],
    statusHistory: [{ id: 'order-history-customer-discount-e2e', status: 'READY', createdAt }],
    createdAt,
    updatedAt: createdAt,
}

const discountedOrder = {
    ...order,
    orderNumber: 6383,
    discountAmount: 50,
    total: 190,
}

type Discount = {
    id: string
    type: 'PERCENTAGE' | 'FIXED_AMOUNT'
    value: number
    status: DiscountStatus
    expiresAt: string
    createdAt: string
    usedAt: string | null
}

const publicCatalog = {
    business: {
        id: businessId,
        name: 'Restaurante Cypress',
        slug: publicSlug,
        description: 'Catálogo para verificar descuentos personales.',
        logoUrl: null,
        logoBlurUrl: null,
        coverUrl: null,
        coverBlurUrl: null,
        ubication: 'Mazatlán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: null,
        whatsappNumber: '+526681234567',
    },
    menus: [
        {
            id: 'menu-discount-checkout-e2e',
            businessId,
            name: 'Menú',
            description: null,
            isActive: true,
            categories: [
                {
                    id: 'category-discount-checkout-e2e',
                    businessId,
                    menuId: 'menu-discount-checkout-e2e',
                    name: 'Platillos',
                    description: null,
                    sortOrder: 0,
                    isActive: true,
                    products: [
                        {
                            id: publicProductId,
                            businessId,
                            categoryId: 'category-discount-checkout-e2e',
                            name: 'Combo de la casa',
                            description: 'Combo para probar un descuento personal.',
                            price: 240,
                            imageUrl: null,
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [],
                        },
                    ],
                },
            ],
        },
    ],
}

function installDashboardApi(options: { initiallyListed?: boolean; listedOrder?: typeof order } = {}) {
    const state: { orderIsAvailable: boolean } = {
        orderIsAvailable: options.initiallyListed ?? true,
    }
    const listedOrder = options.listedOrder ?? order

    cy.intercept('GET', '**/businesses/settings', {
        statusCode: 200,
        body: {
            id: 'settings-realtime-discount-options-e2e',
            businessId,
            currency: 'MXN',
            phone: null,
            whatsapp: null,
            address: null,
            timezone: 'America/Mazatlan',
            createdAt,
            updatedAt: createdAt,
        },
    })

    cy.intercept('GET', '**/businesses/*/orders*', (request) => {
        const url = new URL(request.url)
        const isCountRequest = url.searchParams.get('limit') === '1'
        if (!isCountRequest) request.alias = 'ordersList'
        const orderMatchesSearch =
            !url.searchParams.get('search') ||
            listedOrder.customerName
                .toLowerCase()
                .includes((url.searchParams.get('search') ?? '').toLowerCase())
        request.reply({
            statusCode: 200,
            body: {
                orders: state.orderIsAvailable && orderMatchesSearch ? [listedOrder] : [],
                page: 1,
                limit: 20,
                total: state.orderIsAvailable && orderMatchesSearch ? 1 : 0,
            },
        })
    })

    cy.intercept('GET', `**/businesses/orders/${order.id}`, (request) => {
        state.orderIsAvailable = true
        request.alias = 'getOrderDetail'
        request.reply({ statusCode: 200, body: { order: listedOrder } })
    })

    return state
}

function orderCard(target = order) {
    return cy.contains('article', `#${String(target.orderNumber).padStart(3, '0')}`)
}

function discountPanel() {
    return cy.contains('section', 'Haz que vuelva')
}

function openDiscountCreator() {
    cy.login()
    cy.visit('/dashboard/orders')
    cy.wait('@ordersList')
    orderCard().contains('button', `#${String(order.orderNumber).padStart(3, '0')}`).click()
    cy.wait('@getOrderDetail')
    cy.wait('@getCustomerDiscount')
    discountPanel().contains('button', 'Crear descuento').click()
}

function openPublicDiscountCheckout(discount: Discount) {
    const state = { discount }
    cy.intercept('GET', `**/api/v1/public/businesses/${publicSlug}/catalog`, {
        statusCode: 200,
        body: publicCatalog,
    }).as('getInvalidationCatalog')
    cy.intercept('POST', `**/businesses/${businessId}/customer-discount/preview`, (request) => {
        request.alias = 'previewInvalidationDiscount'
        request.reply({
            statusCode: 200,
            body: { discount: state.discount.status === 'AVAILABLE' ? state.discount : null },
        })
    })
    cy.visit(`/${publicSlug}`)
    cy.wait('@getInvalidationCatalog')
    cy.contains('article', 'Combo de la casa').contains('button', 'Agregar al carrito').click()
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('#customer-name').type(checkoutCustomerName)
    cy.get('#customer-phone').type('668-123-4567')
    cy.wait('@previewInvalidationDiscount')
    cy.window().then((window) => {
        cy.stub(window, 'open').returns({
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        })
    })
    return state
}

describe('Descuentos personales para clientes', () => {
    it('muestra loading mientras consulta el descuento del cliente', () => {
        installDashboardApi()
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, {
            statusCode: 200,
            delay: 1000,
            body: { discount: null },
        }).as('getCustomerDiscount')
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        orderCard().contains('button', `#${String(order.orderNumber).padStart(3, '0')}`).click()
        cy.wait('@getOrderDetail')
        discountPanel()
            .find('[data-testid="customer-discount-skeleton"]')
            .should('be.visible')
            .and('have.attr', 'aria-label', 'Cargando información del cupón')
        cy.wait('@getCustomerDiscount')
    })

    it('muestra error al consultar el descuento y permite reintentar', () => {
        installDashboardApi()
        let reads = 0
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            reads += 1
            request.alias = 'getCustomerDiscount'
            request.reply(
                reads === 1
                    ? { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } }
                    : { statusCode: 200, body: { discount: null } },
            )
        })
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        orderCard().contains('button', `#${String(order.orderNumber).padStart(3, '0')}`).click()
        cy.wait('@getOrderDetail')
        cy.wait('@getCustomerDiscount')
        discountPanel()
            .find('[data-testid="customer-discount-error"]')
            .should('contain', 'No pudimos cargar el cupón de esta orden correctamente')
        discountPanel().contains('button', 'Intentar de nuevo').click()
        cy.wait('@getCustomerDiscount')
        discountPanel().contains('button', 'Crear descuento').should('be.visible')
        cy.then(() => expect(reads).to.eq(2))
    })

    it('muestra el cupón canjeado en la tarjeta y en el detalle de la orden', () => {
        installDashboardApi({ listedOrder: discountedOrder })
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, {
            statusCode: 200,
            body: {
                discount: {
                    id: 'discount-used-in-order',
                    type: 'FIXED_AMOUNT',
                    value: 50,
                    status: 'USED',
                    expiresAt: '2026-11-30T18:00:00.000Z',
                    createdAt,
                    usedAt: createdAt,
                    usedOrder: { id: order.id, orderNumber: discountedOrder.orderNumber },
                },
            },
        }).as('getRedeemedCustomerDiscount')

        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        orderCard(discountedOrder)
            .should('contain', 'Cupón canjeado')
            .and('contain', '$50.00')
            .contains('button', `#${String(discountedOrder.orderNumber).padStart(3, '0')}`)
            .click()
        cy.wait('@getOrderDetail')
        cy.wait('@getRedeemedCustomerDiscount')
        cy.get('[role="dialog"]')
            .should('contain', 'Cupón canjeado')
            .and('contain', 'El cliente ahorró')
            .and('contain', '$50.00')
    })

    it('abre el formulario con porcentaje y valida el valor mínimo', () => {
        installDashboardApi()
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, { statusCode: 200, body: { discount: null } }).as('getCustomerDiscount')
        openDiscountCreator()
        discountPanel().contains('button', 'Porcentaje').should('have.attr', 'aria-pressed', 'true')
        discountPanel().find('input[aria-label="Porcentaje personalizado"]').clear().type('0')
        discountPanel().contains('button', 'Crear descuento').should('be.disabled')
        discountPanel().find('input[aria-label="Porcentaje personalizado"]').clear().type('101')
        discountPanel().contains('button', 'Crear descuento').should('be.disabled')
    })

    it('advierte cuando el porcentaje es cero, negativo o supera el 100%', () => {
        installDashboardApi()
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, {
            statusCode: 200,
            body: { discount: null },
        }).as('getCustomerDiscount')
        openDiscountCreator()

        const percentageInput = () =>
            discountPanel().find('input[aria-label="Porcentaje personalizado"]')

        percentageInput().clear().type('0')
        discountPanel().find('[role="alert"]').should('contain', 'debe ser mayor que 0%')
        discountPanel().should('not.contain', '0% de descuento')
        discountPanel().contains('button', 'Crear descuento').should('be.disabled')

        percentageInput().clear().type('-5')
        discountPanel().find('[role="alert"]').should('contain', 'no puede superar el 100%')
        discountPanel().should('not.contain', '-5% de descuento')
        discountPanel().contains('button', 'Crear descuento').should('be.disabled')

        percentageInput().clear().type('101')
        discountPanel().find('[role="alert"]').should('contain', 'no puede superar el 100%')
        discountPanel().should('not.contain', '101% de descuento')
        discountPanel().contains('button', 'Crear descuento').should('be.disabled')
    })

    it('limita el porcentaje personalizado a tres dígitos', () => {
        installDashboardApi()
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, {
            statusCode: 200,
            body: { discount: null },
        }).as('getCustomerDiscount')
        openDiscountCreator()

        discountPanel()
            .find('input[aria-label="Porcentaje personalizado"]')
            .clear()
            .type('1000')
            .should('have.value', '100')
        discountPanel().contains('button', 'Crear descuento').should('not.be.disabled')
    })

    it('rechaza decimales y conserva únicamente números enteros', () => {
        installDashboardApi()
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, {
            statusCode: 200,
            body: { discount: null },
        }).as('getCustomerDiscount')
        openDiscountCreator()

        discountPanel()
            .find('input[aria-label="Porcentaje personalizado"]')
            .clear()
            .type('9.99')
            .should('have.value', '999')
        discountPanel().should('not.contain', '9.99% de descuento')
    })

    it('crea un descuento porcentual con el payload correcto', () => {
        installDashboardApi()
        const state: { discount: Discount | null } = { discount: null }
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            request.reply({ statusCode: 200, body: { discount: state.discount } })
        }).as('getCustomerDiscount')
        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            expect(request.body).to.deep.equal({ type: 'PERCENTAGE', value: 20 })
            state.discount = { id: 'discount-percent-granular', type: 'PERCENTAGE', value: 20, status: 'AVAILABLE', expiresAt: '2026-11-30T18:00:00.000Z', createdAt, usedAt: null }
            request.reply({ statusCode: 201, body: { discount: state.discount } })
        }).as('createPercentageDiscount')
        openDiscountCreator()
        discountPanel().contains('button', '20%').click()
        discountPanel().contains('button', 'Crear descuento').click()
        cy.wait('@createPercentageDiscount')
        discountPanel().should('contain', 'Descuento creado correctamente').and('contain', '20% de descuento')
    })

    it('muestra loading y bloquea acciones mientras crea el descuento', () => {
        installDashboardApi()
        const state: { discount: Discount | null } = { discount: null }
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            request.reply({ statusCode: 200, body: { discount: state.discount } })
        }).as('getCustomerDiscount')
        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            state.discount = { id: 'discount-loading-granular', type: 'PERCENTAGE', value: 10, status: 'AVAILABLE', expiresAt: '2026-11-30T18:00:00.000Z', createdAt, usedAt: null }
            request.reply({ statusCode: 201, delay: 700, body: { discount: state.discount } })
        }).as('createLoadingDiscount')
        openDiscountCreator()
        discountPanel().contains('button', 'Crear descuento').click()
        discountPanel().contains('button', 'Creando…').should('be.disabled')
        discountPanel().contains('button', 'Cancelar').should('be.disabled')
        cy.wait('@createLoadingDiscount')
    })

    it('crea un descuento de cantidad fija con el payload correcto', () => {
        installDashboardApi()
        const state: { discount: Discount | null } = { discount: null }
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            request.reply({ statusCode: 200, body: { discount: state.discount } })
        }).as('getCustomerDiscount')
        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            expect(request.body).to.deep.equal({ type: 'FIXED_AMOUNT', value: 50 })
            state.discount = { id: 'discount-fixed-granular', type: 'FIXED_AMOUNT', value: 50, status: 'AVAILABLE', expiresAt: '2026-11-30T18:00:00.000Z', createdAt, usedAt: null }
            request.reply({ statusCode: 201, body: { discount: state.discount } })
        }).as('createFixedDiscount')
        openDiscountCreator()
        discountPanel().contains('button', 'Cantidad fija').click()
        discountPanel().find('input[aria-label="Cantidad fija personalizada"]').should('have.value', '20')
        discountPanel().contains('button', '$50').click()
        discountPanel().contains('button', 'Crear descuento').click()
        cy.wait('@createFixedDiscount')
        discountPanel().should('contain', 'Descuento creado correctamente').and('contain', '$50.00 de descuento')
    })

    it('muestra error al crear un descuento y conserva el formulario para reintentar', () => {
        installDashboardApi()
        const state: { discount: Discount | null } = { discount: null }
        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            request.reply({ statusCode: 200, body: { discount: state.discount } })
        }).as('getCustomerDiscount')
        let attempts = 0
        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            attempts += 1
            request.alias = attempts === 1 ? 'createDiscountFailure' : 'createDiscountRetry'
            request.reply(
                attempts === 1
                    ? { statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } }
                    : { statusCode: 201, body: { discount: state.discount = { id: 'discount-retry-granular', type: 'PERCENTAGE', value: 10, status: 'AVAILABLE', expiresAt: '2026-11-30T18:00:00.000Z', createdAt, usedAt: null } } },
            )
        })
        openDiscountCreator()
        discountPanel().contains('button', 'Crear descuento').click()
        cy.wait('@createDiscountFailure')
        discountPanel().find('[role="alert"]').should('contain', 'No pudimos crear el descuento')
        discountPanel().find('input[aria-label="Porcentaje personalizado"]').should('have.value', '10')
        discountPanel().contains('button', 'Crear descuento').click()
        cy.wait('@createDiscountRetry')
        discountPanel().should('contain', 'Descuento creado correctamente')
        cy.then(() => expect(attempts).to.eq(2))
    })

    it('otorga un monto fijo, lo aplica al siguiente pedido y lo consume', () => {
        installDashboardApi()
        const state: { discount: Discount | null } = { discount: null }

        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            request.reply({ statusCode: 200, body: { discount: state.discount } })
        }).as('getCustomerDiscount')

        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            expect(request.body).to.deep.equal({ type: 'FIXED_AMOUNT', value: 50 })
            state.discount = {
                id: 'customer-discount-realtime-e2e',
                type: 'FIXED_AMOUNT',
                value: 50,
                status: 'AVAILABLE',
                expiresAt: '2026-11-30T18:00:00.000Z',
                createdAt,
                usedAt: null,
            }
            request.reply({ statusCode: 201, body: { discount: state.discount } })
        }).as('createCustomerDiscount')

        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        orderCard()
            .contains('button', `#${String(order.orderNumber).padStart(3, '0')}`)
            .click()
        cy.wait('@getOrderDetail')

        cy.get('[role="dialog"][aria-labelledby="order-detail-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', `Pedido #${order.orderNumber}`).should('be.visible')
                cy.contains('Para llevar / recoger').should('be.visible')
            })

        cy.wait('@getCustomerDiscount')
        cy.contains('section', 'Haz que vuelva').contains('button', 'Crear descuento').click()
        cy.contains('button', 'Cantidad fija').click()
        cy.get('input[aria-label="Cantidad fija personalizada"]').clear().type('0')
        cy.contains('button', 'Crear descuento').should('be.disabled')
        cy.get('input[aria-label="Cantidad fija personalizada"]').clear().type('50')
        cy.contains('El cliente recibirá').should('contain', '$50.00 de descuento')
        cy.contains('button', 'Crear descuento').click()

        cy.wait('@createCustomerDiscount')
        cy.contains('Descuento creado correctamente').should('be.visible')
        cy.contains('50.00 de descuento').should('be.visible')
        cy.contains('Vence el').should('be.visible')

        cy.intercept('GET', `**/api/v1/public/businesses/${publicSlug}/catalog`, {
            statusCode: 200,
            body: publicCatalog,
        }).as('getPublicCatalog')
        cy.intercept('POST', `**/businesses/${businessId}/customer-discount/preview`, (request) => {
            expect(request.body).to.deep.equal({ customerPhone: '6681234567' })
            request.alias = 'previewCheckoutDiscount'
            request.reply({
                statusCode: 200,
                body: {
                    discount: state.discount?.status === 'AVAILABLE' ? state.discount : null,
                },
            })
        })

        const whatsappPopup = {
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        }
        cy.visit(`/${publicSlug}`)
        cy.wait('@getPublicCatalog')
        cy.window().then((window) => cy.stub(window, 'open').returns(whatsappPopup))
        cy.contains('article', 'Combo de la casa').contains('button', 'Agregar al carrito').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type(checkoutCustomerName)
        cy.get('#customer-phone').type('668-123-4567')
        cy.wait('@previewCheckoutDiscount')
        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .should('contain', '¡Tienes un descuento!')
            .and('contain', 'Se aplicará automáticamente.')
            .and('contain', '−$50.00')
            .and('contain', '$190.00')
        cy.intercept('POST', `**/businesses/${businessId}/orders`, (request) => {
            expect(request.body).to.deep.include({
                customer: { name: checkoutCustomerName, phone: '6681234567' },
                fulfillmentType: 'DINE_IN',
            })
            expect(request.body.items).to.deep.equal([
                { productId: publicProductId, quantity: 1, optionIds: [] },
            ])
            expect(request.body.expectedSubtotal).to.equal(240)
            expect(request.body).not.to.have.any.keys('discountId', 'discountAmount', 'total')
            state.discount!.status = 'USED'
            request.reply({
                statusCode: 201,
                body: {
                    order: {
                        id: 'order-discount-checkout-e2e',
                        orderNumber: 6383,
                        status: 'PENDING',
                        customerId: order.customerId,
                        customerName: 'Cliente Cypress fidelizado',
                        customerPhone: '6681234567',
                        subtotal: 240,
                        discountAmount: 50,
                        total: 190,
                        notes: null,
                        items: [],
                        statusHistory: [],
                    },
                },
            })
        }).as('createDiscountedOrder')

        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .contains('button', 'Confirmar pedido')
            .click()
        cy.wait('@createDiscountedOrder')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
            .should('be.visible')
            .and('contain', '¡Tu pedido está listo!')
        cy.then(() => {
            const whatsappMessage =
                new URL(whatsappPopup.location.href).searchParams.get('text') ?? ''
            expect(whatsappPopup.location.href).to.contain('https://wa.me/526681234567?text=')
            expect(whatsappMessage).to.contain('Cupón canjeado: −$50.00')
            expect(whatsappMessage).to.contain('Total: $190.00')
        })

        cy.visit(`/${publicSlug}`)
        cy.wait('@getPublicCatalog')
        cy.contains('article', 'Combo de la casa').contains('button', 'Agregar al carrito').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type(checkoutCustomerName)
        cy.get('#customer-phone').type('668-123-4567')
        cy.wait('@previewCheckoutDiscount')
        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .contains('¡Tienes un descuento!')
            .should('not.exist')
    })

    it('informa que ya existe un descuento activo y evita emitir otro', () => {
        installDashboardApi()
        let createCalls = 0
        let discountReads = 0
        const activeDiscount: Discount = {
            id: 'customer-discount-existing-e2e',
            type: 'PERCENTAGE',
            value: 15,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        }

        cy.intercept('GET', `**/businesses/orders/${order.id}/discount`, (request) => {
            discountReads += 1
            request.alias = discountReads === 1 ? 'getCustomerDiscount' : 'refreshCustomerDiscount'
            request.reply({
                statusCode: 200,
                body: { discount: discountReads === 1 ? null : activeDiscount },
            })
        })
        cy.intercept('POST', `**/businesses/orders/${order.id}/discount`, (request) => {
            createCalls += 1
            request.reply({
                statusCode: 409,
                body: {
                    error: {
                        code: 'CUSTOMER_DISCOUNT_ALREADY_ACTIVE',
                        message: 'Este cliente ya tiene un descuento activo.',
                    },
                },
            })
        }).as('createCustomerDiscount')
        cy.login()
        cy.visit('/dashboard/orders')
        cy.wait('@ordersList')
        orderCard()
            .contains('button', `#${String(order.orderNumber).padStart(3, '0')}`)
            .click()
        cy.wait('@getOrderDetail')
        cy.wait('@getCustomerDiscount')
        cy.contains('section', 'Haz que vuelva').contains('button', 'Crear descuento').click()
        cy.contains('button', 'Crear descuento').click()

        cy.wait('@createCustomerDiscount')
        cy.contains('Este cliente ya tiene un descuento disponible para su próximo pedido.').should(
            'be.visible',
        )
        cy.wait('@refreshCustomerDiscount')
        cy.contains('15% de descuento').should('be.visible')
        cy.then(() => expect(createCalls).to.eq(1))
        cy.contains('button', 'Crear descuento').should('not.exist')
    })

    it('calcula y aplica el porcentaje sobre el subtotal confirmado por el backend', () => {
        const percentageDiscount: Discount = {
            id: 'customer-discount-percentage-e2e',
            type: 'PERCENTAGE',
            value: 15,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        }

        cy.intercept('GET', `**/api/v1/public/businesses/${publicSlug}/catalog`, {
            statusCode: 200,
            body: publicCatalog,
        }).as('getPublicCatalog')
        cy.intercept('POST', `**/businesses/${businessId}/customer-discount/preview`, (request) => {
            expect(request.body).to.deep.equal({ customerPhone: '6681234567' })
            request.reply({ statusCode: 200, body: { discount: percentageDiscount } })
        }).as('previewPercentageDiscount')
        cy.intercept('POST', `**/businesses/${businessId}/orders`, (request) => {
            expect(request.body).to.deep.include({
                customer: { name: checkoutCustomerName, phone: '6681234567' },
                fulfillmentType: 'DINE_IN',
            })
            expect(request.body.items).to.deep.equal([
                { productId: publicProductId, quantity: 1, optionIds: [] },
            ])
            expect(request.body.expectedSubtotal).to.equal(240)
            request.reply({
                statusCode: 201,
                body: {
                    order: {
                        id: 'order-percentage-discount-e2e',
                        orderNumber: 6384,
                        status: 'PENDING',
                        customerId: order.customerId,
                        customerName: 'Cliente Cypress fidelizado',
                        customerPhone: '6681234567',
                        subtotal: 240,
                        discountAmount: 36,
                        total: 204,
                        notes: null,
                        items: [],
                        statusHistory: [],
                    },
                },
            })
        }).as('createPercentageDiscountOrder')

        const whatsappPopup = {
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        }
        cy.visit(`/${publicSlug}`)
        cy.wait('@getPublicCatalog')
        cy.window().then((window) => cy.stub(window, 'open').returns(whatsappPopup))
        cy.contains('article', 'Combo de la casa').contains('button', 'Agregar al carrito').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('#customer-name').type(checkoutCustomerName)
        cy.get('#customer-phone').type('668-123-4567')
        cy.wait('@previewPercentageDiscount')

        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .should('contain', '15% de descuento')
            .and('contain', '−$36.00')
            .and('contain', '$204.00')
            .contains('button', 'Confirmar pedido')
            .click()
        cy.wait('@createPercentageDiscountOrder')
        cy.then(() => {
            const message = new URL(whatsappPopup.location.href).searchParams.get('text') ?? ''
            expect(message).to.contain('Cupón canjeado: −$36.00')
            expect(message).to.contain('Total: $204.00')
        })
    })

    it('invalida un cupón porcentual eliminado antes de confirmar y recalcula el total', () => {
        const state = openPublicDiscountCheckout({
            id: 'discount-invalidated-percentage',
            type: 'PERCENTAGE',
            value: 20,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').should('contain', '−$48.00').and('contain', '$192.00')
        cy.then(() => {
            state.discount.status = 'CANCELLED'
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@previewInvalidationDiscount')
        cy.get('[data-testid="discount-invalidated"]').should('contain', 'Cupón invalidado').and('contain', 'ya no será válido')
        cy.get('[role="dialog"][aria-labelledby="order-title"]').should('not.contain', 'Tu descuento').and('contain', '$240.00')
        cy.get('[data-testid="discount-invalidated-confirmation"]').should('contain', '¿Quieres continuar sin el cupón?')
    })

    it('invalida un cupón de cantidad fija eliminado y no muestra descuento verde', () => {
        const state = openPublicDiscountCheckout({
            id: 'discount-invalidated-fixed',
            type: 'FIXED_AMOUNT',
            value: 50,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').should('contain', '−$50.00').and('contain', '$190.00')
        cy.then(() => {
            state.discount.status = 'CANCELLED'
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@previewInvalidationDiscount')
        cy.get('[data-testid="discount-invalidated"]').should('be.visible')
        cy.get('[role="dialog"][aria-labelledby="order-title"]').should('not.contain', '−$50.00').and('contain', '$240.00')
    })

    it('permite cancelar el pedido desde la confirmación de cupón inválido', () => {
        const state = openPublicDiscountCheckout({
            id: 'discount-invalidated-cancel',
            type: 'PERCENTAGE',
            value: 15,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        cy.then(() => {
            state.discount.status = 'CANCELLED'
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@previewInvalidationDiscount')
        cy.get('[data-testid="discount-invalidated-confirmation"]').contains('button', 'Cancelar pedido').click()
        cy.get('[role="dialog"][aria-labelledby="order-title"]').should('not.exist')
        cy.contains('button', 'Ver mi pedido').should('contain', '$240')
    })

    it('limpia el estado de cupón inválido después de continuar y crear la orden', () => {
        const state = openPublicDiscountCheckout({
            id: 'discount-invalidated-after-order',
            type: 'PERCENTAGE',
            value: 20,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        cy.then(() => {
            state.discount.status = 'CANCELLED'
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@previewInvalidationDiscount')
        cy.intercept('POST', `**/businesses/${businessId}/orders`, {
            statusCode: 201,
            body: {
                order: {
                    id: 'order-after-invalidated-discount',
                    orderNumber: 6400,
                    status: 'PENDING',
                    customerId: order.customerId,
                    customerName: checkoutCustomerName,
                    customerPhone: '6681234567',
                    subtotal: 240,
                    discountAmount: 0,
                    total: 240,
                    notes: null,
                    items: [],
                    statusHistory: [],
                },
            },
        }).as('createOrderAfterInvalidation')
        cy.get('[data-testid="discount-invalidated-confirmation"]').contains('button', 'Continuar sin descuento').click()
        cy.wait('@createOrderAfterInvalidation')
        cy.contains('button', 'Seguir viendo el menú').click()
        cy.contains('article', 'Combo de la casa').contains('button', 'Agregar al carrito').click()
        cy.contains('button', 'Ver mi pedido').click()
        cy.get('[data-testid="discount-invalidated"]').should('not.exist')
        cy.get('[data-testid="discount-invalidated-confirmation"]').should('not.exist')
    })

    it('muestra error si el backend no puede aplicar un cupón válido y permite reintentar', () => {
        openPublicDiscountCheckout({
            id: 'discount-application-failure-retry',
            type: 'PERCENTAGE',
            value: 20,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        let attempts = 0
        cy.intercept('POST', `**/businesses/${businessId}/orders`, (request) => {
            attempts += 1
            request.alias = attempts === 1 ? 'couponOrderFailure' : 'couponOrderRetry'
            request.reply(attempts === 1 ? { statusCode: 409, body: { error: { code: 'CUSTOMER_DISCOUNT_APPLICATION_FAILED' } } } : {
                statusCode: 201,
                body: { order: { id: 'order-coupon-retry', orderNumber: 6401, status: 'PENDING', customerId: order.customerId, customerName: checkoutCustomerName, customerPhone: '6681234567', subtotal: 240, discountAmount: 48, total: 192, notes: null, items: [], statusHistory: [] } },
            })
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@couponOrderFailure')
        cy.get('[data-testid="coupon-application-error"]').should('contain', 'Error al aplicar el cupón').and('contain', 'Reintentar')
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Reintentar').click()
        cy.wait('@couponOrderRetry')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]').should('be.visible')
    })

    it('permite crear el pedido sin cupón después de un fallo de aplicación', () => {
        openPublicDiscountCheckout({
            id: 'discount-application-failure-skip',
            type: 'FIXED_AMOUNT',
            value: 50,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T18:00:00.000Z',
            createdAt,
            usedAt: null,
        })
        let attempts = 0
        cy.intercept('POST', `**/businesses/${businessId}/orders`, (request) => {
            attempts += 1
            request.alias = attempts === 1 ? 'couponOrderFailureSkip' : 'couponOrderWithoutDiscount'
            if (attempts === 1) {
                request.reply({ statusCode: 409, body: { error: { code: 'CUSTOMER_DISCOUNT_APPLICATION_FAILED' } } })
                return
            }
            expect(request.body.ignoreCustomerDiscount).to.equal(true)
            expect(request.body).not.to.have.any.keys('discountAmount', 'discountId')
            request.reply({ statusCode: 201, body: { order: { id: 'order-without-coupon', orderNumber: 6402, status: 'PENDING', customerId: order.customerId, customerName: checkoutCustomerName, customerPhone: '6681234567', subtotal: 240, discountAmount: 0, total: 240, notes: null, items: [], statusHistory: [] } } })
        })
        cy.get('[role="dialog"][aria-labelledby="order-title"]').contains('button', 'Confirmar pedido').click()
        cy.wait('@couponOrderFailureSkip')
        cy.get('[data-testid="coupon-application-error"]').contains('button', 'Sin cupón').click()
        cy.wait('@couponOrderWithoutDiscount')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]').should('be.visible')
    })
})

export {}
