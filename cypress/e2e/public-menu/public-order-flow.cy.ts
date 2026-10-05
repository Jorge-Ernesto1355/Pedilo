const slug = 'antojitos-del-barrio'
const businessId = 'business-public-order-e2e'
const tacoId = 'product-taco-order-e2e'
const aguaId = 'product-agua-order-e2e'
const extrasGroupId = 'group-extras-order-e2e'
const salsaGroupId = 'group-salsa-order-e2e'
const aguacateId = 'option-aguacate-order-e2e'
const salsaId = 'option-salsa-order-e2e'

const catalog = {
    business: {
        id: businessId,
        name: 'Antojitos del Barrio',
        slug,
        description: 'Comida casera para compartir.',
        logoUrl: null,
        logoBlurUrl: null,
        coverUrl: null,
        coverBlurUrl: null,
        ubication: 'Mazatlán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: null,
        whatsappNumber: '+526691234567',
    },
    menus: [
        {
            id: 'menu-order-e2e',
            businessId,
            name: 'Menú del día',
            description: 'Favoritos de la casa.',
            isActive: true,
            categories: [
                {
                    id: 'category-order-e2e',
                    businessId,
                    menuId: 'menu-order-e2e',
                    name: 'Comida',
                    description: 'Hecho al momento.',
                    sortOrder: 0,
                    isActive: true,
                    products: [
                        {
                            id: tacoId,
                            businessId,
                            categoryId: 'category-order-e2e',
                            name: 'Taco especial',
                            description: 'Taco con opciones de personalización.',
                            price: 89,
                            imageUrl: null,
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [
                                {
                                    id: extrasGroupId,
                                    productId: tacoId,
                                    name: 'Extras',
                                    isRequired: true,
                                    minSelections: 1,
                                    maxSelections: 2,
                                    sortOrder: 0,
                                    isActive: true,
                                    options: [
                                        {
                                            id: aguacateId,
                                            optionGroupId: extrasGroupId,
                                            name: 'Aguacate',
                                            price: 20,
                                            sortOrder: 0,
                                            isAvailable: true,
                                        },
                                    ],
                                },
                                {
                                    id: salsaGroupId,
                                    productId: tacoId,
                                    name: 'Salsa extra',
                                    isRequired: false,
                                    minSelections: 0,
                                    maxSelections: 1,
                                    sortOrder: 1,
                                    isActive: true,
                                    options: [
                                        {
                                            id: salsaId,
                                            optionGroupId: salsaGroupId,
                                            name: 'Salsa verde',
                                            price: 10,
                                            sortOrder: 0,
                                            isAvailable: true,
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            id: aguaId,
                            businessId,
                            categoryId: 'category-order-e2e',
                            name: 'Agua fresca',
                            description: 'Jamaica natural.',
                            price: 35,
                            imageUrl: null,
                            sortOrder: 1,
                            isAvailable: true,
                            optionGroups: [],
                        },
                    ],
                },
            ],
        },
    ],
}

function installOrderApi() {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: catalog,
    }).as('getPublicCatalog')

    cy.intercept('POST', '**/businesses/*/orders', (request) => {
        request.alias = 'createPublicOrder'
        request.reply({
            statusCode: 201,
            body: {
                order: {
                    id: 'order-public-e2e',
                    orderNumber: 2042,
                    status: 'PENDING',
                    customerId: 'customer-public-e2e',
                    customerName: request.body.customer.name,
                    customerPhone: request.body.customer.phone,
                    subtotal: 119,
                    total: 119,
                    notes: request.body.notes,
                    items: request.body.items,
                    statusHistory: [],
                },
            },
        })
    })
}

describe('Crear pedido desde el catálogo público', () => {
    it('agrega productos, valida opciones, modifica cantidades y crea el pedido', () => {
        installOrderApi()

        cy.visit(`/menu/${slug}`)
        cy.wait('@getPublicCatalog')
        cy.window().then((window) => {
            cy.stub(window, 'open')
                .as('openWhatsApp')
                .returns({
                    document: { title: '', body: { innerHTML: '' } },
                    location: { href: '' },
                    close: () => undefined,
                })
        })

        cy.contains('article', 'Agua fresca').within(() => {
            cy.contains('button', 'Agregar al carrito').click()
            cy.contains('button', 'Agregar al carrito').click()
        })
        cy.contains('button', 'Seleccionar opciones').click()

        cy.get('[role="dialog"][aria-labelledby="customize-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', 'Taco especial').should('be.visible')
                cy.contains('legend', 'Extras').should('contain', 'Mínimo 1 · máximo 2')
                cy.contains('legend', 'Salsa extra').should('contain', 'Opcional · máximo 1')
                cy.contains('button', 'Agregar al pedido').should('be.disabled')

                cy.get('button[aria-label="Agregar Aguacate"]').click()
                cy.get('button[aria-label="Agregar Salsa verde"]').click()
                cy.contains('button', 'Agregar al pedido').should('not.be.disabled').click()
            })

        cy.contains('button', 'Ver mi pedido')
            .should('contain', '3 productos')
            .and('contain', '$189')
            .click()

        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('Taco especial').should('be.visible')
                cy.contains('Extras: Aguacate').should('be.visible')
                cy.contains('Salsa extra: Salsa verde').should('be.visible')
                cy.contains('Agua fresca').should('be.visible')
                cy.contains('$119 c/u').should('be.visible')
                cy.contains('$35 c/u').should('be.visible')

                cy.get(`button[aria-label="Agregar una unidad de Agua fresca"]`).click()
                cy.contains('button', 'Confirmar pedido')
                    .should('contain', '$224')
                    .and('be.disabled')

                cy.get(`button[aria-label="Quitar una unidad de Agua fresca"]`).click()
                cy.get(`button[aria-label="Quitar una unidad de Agua fresca"]`).click()
                cy.get(`button[aria-label="Quitar una unidad de Agua fresca"]`).click()
                cy.contains('Agua fresca').should('not.exist')
                cy.contains('button', 'Confirmar pedido').should('contain', '$119')

                cy.get('#customer-name').type('Jorge Pérez')
                cy.get('#customer-phone').type('123')
                cy.contains('Usa 10 números, por ejemplo 669-123-4567. No uses +52.').should(
                    'be.visible',
                )
                cy.contains('button', 'Confirmar pedido').should('be.disabled')

                cy.get('#customer-phone').clear().type('669-123-4567')
                cy.get('#order-notes').type('Sin cebolla')
                cy.contains('button', 'Confirmar pedido').should('not.be.disabled').click()
            })

        cy.wait('@createPublicOrder').then(({ request }) => {
            expect(request.body).to.deep.equal({
                customer: { name: 'Jorge Pérez', phone: '669-123-4567' },
                items: [
                    {
                        productId: tacoId,
                        quantity: 1,
                        optionIds: [aguacateId, salsaId],
                    },
                ],
                notes: 'Sin cebolla',
            })
        })

        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
            .should('be.visible')
            .and('contain', '¡Pedido enviado!')
            .and('contain', 'Tu pedido fue enviado al negocio.')
    })
})

export {}
