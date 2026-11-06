import type { CyHttpMessages, RouteHandler } from 'cypress/types/net-stubbing'

export {}

const slug = 'discount-checkout-e2e'
const checkoutBusinessId = 'business-discount-checkout-e2e'

const products = [
    { id: 'product-checkout-burger', name: 'Hamburguesa descuento', price: 200, final: 180, saving: 20, label: '10% de descuento' },
    { id: 'product-checkout-pizza', name: 'Pizza descuento', price: 150, final: 120, saving: 30, label: '$30.00 de descuento' },
    { id: 'product-checkout-water', name: 'Agua sin descuento', price: 50, final: 50, saving: 0, label: '' },
]

function catalog() {
    return {
        business: {
            id: checkoutBusinessId,
            name: 'Restaurante Checkout Cypress',
            slug,
            description: 'Menú para probar descuentos en checkout.',
            logoUrl: null,
            logoBlurUrl: null,
            coverUrl: null,
            coverBlurUrl: null,
            ubication: 'Culiacán, Sinaloa',
            ubicationMaps: null,
            businessSchedule: null,
            whatsappNumber: '+526691234567',
        },
        menus: [{
            id: 'menu-checkout-e2e',
            businessId: checkoutBusinessId,
            name: 'Menú checkout Cypress',
            description: 'Productos con y sin descuento.',
            isActive: true,
            categories: [{
                id: 'category-checkout-e2e',
                businessId: checkoutBusinessId,
                menuId: 'menu-checkout-e2e',
                name: 'Favoritos',
                description: null,
                isActive: true,
                sortOrder: 0,
                products: products.map((product) => ({
                    ...product,
                    price: product.price,
                    description: `${product.name} para Cypress.`,
                    imageUrl: null,
                    sortOrder: 0,
                    isAvailable: true,
                    optionGroups: [],
                })),
            }],
        }],
    }
}

function activeDiscounts() {
    return {
        discounts: products.filter((product) => product.saving > 0).map((product) => ({
            productId: product.id,
            priceOriginal: product.price,
            priceFinal: product.final,
            price_original: product.price,
            price_final: product.final,
            discount: {
                id: `discount-${product.id}`,
                name: product.label,
                type: product.id === 'product-checkout-pizza' ? 'FIXED' : 'PERCENT',
                value: product.id === 'product-checkout-pizza' ? 30 : 10,
                label: product.label,
                endsAt: '2026-12-31T23:59:00.000Z',
            },
        })),
    }
}

function installCatalog(discounts: RouteHandler = activeDiscounts()) {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: catalog(),
    }).as('checkoutCatalog')
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/discounts`, discounts).as('checkoutDiscounts')
    cy.intercept('POST', `**/api/v1/businesses/${checkoutBusinessId}/customer-discount/preview`, {
        statusCode: 200,
        body: { status: 'NONE' },
    }).as('checkoutCustomerDiscount')
    cy.visit(`/${slug}`)
    cy.wait('@checkoutCatalog')
}

function stubWhatsApp() {
    cy.window().then((window) => {
        cy.stub(window, 'open').as('openWhatsApp').returns({
            document: { title: '', body: { innerHTML: '' } },
            location: { href: '' },
            close: () => undefined,
        })
    })
}

function addProduct(name: string, quantity = 1) {
    cy.contains('article[data-cy="public-product-card"]', name)
        .find('button[aria-label^="Agregar al carrito"]')
        .click()
    for (let index = 1; index < quantity; index += 1) {
        cy.contains('button', 'Ver mi pedido').should('contain', `${index + 1}`)
        cy.contains('article[data-cy="public-product-card"]', name)
            .find('button[aria-label^="Agregar al carrito"]')
            .click()
    }
}

function openCheckout() {
    stubWhatsApp()
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('[role="dialog"][aria-labelledby="order-title"]').should('be.visible').within(() => {
        cy.get('#customer-name').type('Cliente Checkout')
        cy.get('#customer-phone').type('6691234567')
    })
    cy.get('[data-cy="checkout-summary"]').should('be.visible')
}

function installPriceChangeOrder(mode: 'DELETED' | 'FINISHED' | 'EXPIRED', expectedSubtotal = 230, currentSubtotal = 250) {
    let attempts = 0
    cy.intercept('POST', '**/api/v1/businesses/*/orders', (request) => {
        attempts += 1
        if (attempts === 1) {
            request.reply({
                statusCode: 409,
                body: {
                    error: {
                        code: 'ORDER_PRICE_CHANGED',
                        message: `Discount ${mode.toLowerCase()} while checking out`,
                        details: { expectedSubtotal, currentSubtotal, difference: currentSubtotal - expectedSubtotal },
                    },
                },
            })
            return
        }
        request.reply({
            statusCode: 201,
            body: {
                order: {
                    id: `order-discount-${mode.toLowerCase()}-e2e`,
                    orderNumber: attempts,
                    customerName: 'Cliente Checkout',
                    customerPhone: '6691234567',
                    subtotal: currentSubtotal,
                    discountAmount: 0,
                    total: currentSubtotal,
                    items: [],
                    statusHistory: [],
                },
            },
        })
    }).as(`orderDiscount${mode}`)
}

describe('Descuentos · checkout público', () => {
    it('calcula precios, ahorro, subtotal y total con varios productos', () => {
        installCatalog()
        cy.wait('@checkoutDiscounts')
        cy.contains('article', products[0].name).should('contain', '$180.00').and('contain', '$200.00').and('contain', '10% de descuento')
        cy.contains('article', products[1].name).should('contain', '$120.00').and('contain', '$150.00').and('contain', '$30.00 de descuento')
        cy.contains('article', products[2].name).should('contain', '$50.00')

        addProduct(products[0].name)
        addProduct(products[1].name, 2)
        addProduct(products[2].name)
        openCheckout()

        cy.get('[role="dialog"]').should('contain', products[0].name).and('contain', '$180.00 c/u')
            .and('contain', products[1].name).and('contain', '$120.00 c/u')
            .and('contain', products[2].name).and('contain', '$50.00 c/u')
        cy.get('[data-cy="checkout-subtotal"]').should('contain', '$550.00')
        cy.get('[data-cy="checkout-product-savings"]').should('contain', '−$80.00')
        cy.get('[data-cy="checkout-total"]').should('contain', '$470.00')
    })

    it('mantiene el menú y el checkout usable si falla la consulta de descuentos', () => {
        installCatalog({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'temporary failure' } } })
        cy.wait('@checkoutDiscounts')
        cy.contains('article', products[0].name).should('contain', '$200.00').and('not.contain', '10% de descuento')
        addProduct(products[0].name)
        openCheckout()
        cy.get('[data-cy="checkout-subtotal"]').should('contain', '$200.00')
        cy.get('[data-cy="checkout-product-savings"]').should('not.exist')
        cy.get('[data-cy="checkout-total"]').should('contain', '$200.00')
    })

    it('actualiza los precios en segundo plano cuando los descuentos se recuperan después de fallar', () => {
        let attempts = 0
        installCatalog((request: CyHttpMessages.IncomingHttpRequest) => {
            attempts += 1
            if (attempts < 2) request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR' } } })
            else request.reply({ statusCode: 200, body: activeDiscounts() })
        })
        cy.wait('@checkoutDiscounts')
        cy.contains('article', products[0].name).should('contain', '$180.00').and('contain', '10% de descuento')
    })

    ;(['DELETED', 'FINISHED', 'EXPIRED'] as const).forEach((mode) => {
        it(`detecta que el descuento ${mode.toLowerCase()} mientras el cliente está en checkout`, () => {
            installCatalog()
            cy.wait('@checkoutDiscounts')
            addProduct(products[0].name)
            addProduct(products[2].name)
            openCheckout()
            installPriceChangeOrder(mode)
            cy.get('[data-cy="checkout-submit"]').click()
            cy.wait(`@orderDiscount${mode}`)
            cy.get('[data-testid="price-change-warning"]').should('be.visible').and('contain', 'El precio cambió mientras hacías tu pedido').and('contain', 'El subtotal ahora es $250.00').and('contain', 'subió $20.00')
            cy.contains('[data-testid="price-change-warning"] button', 'Continuar').click()
            cy.wait(`@orderDiscount${mode}`).its('request.body').should('include', { acceptPriceChange: true, expectedSubtotal: 230 })
            cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]').should('be.visible')
        })
    })

    it('al cancelar el cambio elimina el descuento inválido del menú, carrito y checkout', () => {
        let currentDiscounts: RouteHandler = activeDiscounts()
        installCatalog((request: CyHttpMessages.IncomingHttpRequest) => request.reply(currentDiscounts))
        cy.wait('@checkoutDiscounts')
        addProduct(products[0].name)
        addProduct(products[2].name)
        openCheckout()
        installPriceChangeOrder('DELETED')
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@orderDiscountDELETED').then(() => {
            currentDiscounts = { statusCode: 200, body: { discounts: [] } }
        })
        cy.get('[data-testid="price-change-warning"] button').contains('Cancelar').click()
        cy.get('[data-cy="checkout-subtotal"]').should('contain', '$250.00')
        cy.get('[data-cy="checkout-product-savings"]').should('not.exist')
        cy.get('[data-cy="checkout-total"]').should('contain', '$250.00')
        cy.get('[role="dialog"]').should('not.contain', '10% de descuento')
        cy.contains('article[data-cy="public-product-card"]', products[0].name).should('not.contain', '10% de descuento')
    })

    it('muestra el warning al editar un descuento y al cancelar sincroniza checkout y menú', () => {
        const previousDiscounts = JSON.parse(JSON.stringify(activeDiscounts())) as { discounts: Array<Record<string, unknown>> }
        const editedDiscount = previousDiscounts.discounts[0]
        editedDiscount.priceFinal = 160
        editedDiscount.price_final = 160
        editedDiscount.discount = { ...(editedDiscount.discount as Record<string, unknown>), value: 20, label: '20% de descuento' }
        let currentDiscounts: RouteHandler = previousDiscounts
        installCatalog((request: CyHttpMessages.IncomingHttpRequest) => request.reply(currentDiscounts))
        cy.wait('@checkoutDiscounts')
        addProduct(products[0].name)
        openCheckout()
        installPriceChangeOrder('FINISHED', 160, 180)
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@orderDiscountFINISHED').then(() => {
            currentDiscounts = activeDiscounts()
        })
        cy.get('@openWhatsApp').should('not.have.been.called')
        cy.get('[data-testid="price-change-warning"]').should('contain', 'El subtotal ahora es $180.00').and('contain', 'subió $20.00')
        cy.contains('[data-testid="price-change-warning"] button', 'Cancelar').click()
        cy.get('[data-cy="checkout-subtotal"]').should('contain', '$200.00')
        cy.get('[data-cy="checkout-product-savings"]').should('contain', '−$20.00')
        cy.get('[data-cy="checkout-total"]').should('contain', '$180.00')
        cy.contains('article[data-cy="public-product-card"]', products[0].name).should('contain', '10% de descuento')
    })

    it('detecta cuando agregan un descuento mientras el cliente ya está en checkout', () => {
        let currentDiscounts: RouteHandler = { discounts: [] }
        installCatalog((request: CyHttpMessages.IncomingHttpRequest) => request.reply(currentDiscounts))
        cy.wait('@checkoutDiscounts')
        addProduct(products[0].name)
        openCheckout()
        cy.then(() => {
            currentDiscounts = activeDiscounts()
        })
        installPriceChangeOrder('FINISHED', 200, 180)
        cy.get('[data-cy="checkout-submit"]').click()
        cy.wait('@orderDiscountFINISHED')
        cy.get('[data-testid="price-change-warning"]').should('be.visible').and('contain', 'El subtotal ahora es $180.00').and('contain', 'bajó $20.00')
        cy.get('@openWhatsApp').should('not.have.been.called')
        cy.contains('[data-testid="price-change-warning"] button', 'Cancelar').click()
        cy.get('[data-cy="checkout-subtotal"]').should('contain', '$200.00')
        cy.get('[data-cy="checkout-product-savings"]').should('contain', '−$20.00')
        cy.get('[data-cy="checkout-total"]').should('contain', '$180.00')
        cy.contains('article[data-cy="public-product-card"]', products[0].name).should('contain', '10% de descuento')
    })

    it('no carga ni aplica el cupón personal cuando el checkout tiene productos con descuento', () => {
        installCatalog()
        cy.wait('@checkoutDiscounts')
        cy.intercept('POST', `**/api/v1/businesses/${checkoutBusinessId}/customer-discount/preview`, {
            statusCode: 200,
            body: {
                discount: {
                    id: 'customer-discount-checkout-e2e',
                    status: 'AVAILABLE',
                    type: 'PERCENTAGE',
                    value: 15,
                    expiresAt: '2026-12-31T23:59:00.000Z',
                },
            },
        }).as('customerCouponAvailable')
        addProduct(products[0].name)
        openCheckout()
        cy.get('[data-testid="customer-discount-unavailable-with-product-discount"]').should('be.visible').and('contain', 'no se puede combinar')
        cy.get('[data-cy="checkout-customer-savings"]').should('not.exist')
    })
})
