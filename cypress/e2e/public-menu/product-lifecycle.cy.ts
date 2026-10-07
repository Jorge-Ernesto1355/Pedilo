const slug = 'catalogo-productos-e2e'
const businessId = 'business-product-lifecycle-e2e'
const productId = 'product-product-lifecycle-e2e'

function publicCatalog(product: { isAvailable: boolean; price: number }) {
    return {
        business: {
            id: businessId,
            name: 'Negocio de productos E2E',
            slug,
            description: 'Catálogo para probar cambios de productos.',
            logoUrl: null,
            logoBlurUrl: null,
            coverUrl: null,
            coverBlurUrl: null,
            ubication: 'Culiacán, Sinaloa',
            ubicationMaps: null,
            businessSchedule: null,
            whatsappNumber: '+526691234567',
        },
        menus: [
            {
                id: 'menu-product-lifecycle-e2e',
                businessId,
                name: 'Menú principal',
                description: 'Productos disponibles.',
                isActive: true,
                categories: [
                    {
                        id: 'category-product-lifecycle-e2e',
                        businessId,
                        menuId: 'menu-product-lifecycle-e2e',
                        name: 'Bebidas',
                        description: null,
                        sortOrder: 0,
                        isActive: true,
                        products: product.isAvailable
                            ? [
                                  {
                                      id: productId,
                                      businessId,
                                      categoryId: 'category-product-lifecycle-e2e',
                                      name: 'Coca Cola',
                                      description: 'Bebida fría.',
                                      price: product.price,
                                      imageUrl: null,
                                      sortOrder: 0,
                                      isAvailable: true,
                                      optionGroups: [],
                                  },
                              ]
                            : [],
                    },
                ],
            },
        ],
    }
}

function installPublicCatalog(product: { isAvailable: boolean; price: number }) {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: publicCatalog(product),
    }).as('getPublicCatalog')
}

function stubWhatsApp() {
    cy.window().then((window) => {
        cy.stub(window, 'open')
            .as('openWhatsApp')
            .returns({
                document: { title: '', body: { innerHTML: '' } },
                location: { href: '' },
                close: () => undefined,
            })
    })
}

function openOrder() {
    cy.contains('article', 'Coca Cola').contains('button', 'Agregar al carrito').click()
    cy.contains('button', 'Ver mi pedido').click()
    cy.get('[role="dialog"][aria-labelledby="order-title"]')
        .should('be.visible')
        .within(() => {
            cy.get('#customer-name').type('Cliente E2E')
            cy.get('#customer-phone').type('669-123-4567')
        })
}

describe('Catálogo público · cambios de disponibilidad y precio', () => {
    it('no muestra un producto desactivado en el catálogo público', () => {
        installPublicCatalog({ isAvailable: false, price: 25 })

        cy.visit(`/${slug}`)
        cy.wait('@getPublicCatalog')
        cy.contains('Coca Cola').should('not.exist')
        cy.contains('Bebidas').should('be.visible')
        cy.contains('0 opciones').should('be.visible')
    })

    it('rechaza un pedido si el producto fue eliminado mientras el catálogo estaba abierto', () => {
        installPublicCatalog({ isAvailable: true, price: 25 })
        cy.intercept('DELETE', `**/api/v1/businesses/products/${productId}`, {
            statusCode: 204,
            body: null,
        }).as('deleteProduct')
        cy.intercept('POST', '**/api/v1/businesses/*/orders', (request) => {
            request.alias = 'createOrder'
            request.reply({
                statusCode: 400,
                body: {
                    error: {
                        code: 'ORDER_PRODUCT_NOT_AVAILABLE',
                        message: 'Product is not available for this business',
                    },
                },
            })
        })

        cy.visit(`/${slug}`)
        cy.wait('@getPublicCatalog')
        stubWhatsApp()

        // La eliminación ocurre mientras el catálogo público ya está abierto.
        cy.window().then((window) =>
            window.fetch(`/api/v1/businesses/products/${productId}`, {
                method: 'DELETE',
                credentials: 'include',
            }),
        )
        cy.wait('@deleteProduct')
        openOrder()
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.contains('Uno de los productos seleccionados ya no está disponible.').should(
            'be.visible',
        )
        cy.contains('ORDER_PRODUCT_NOT_AVAILABLE').should('not.exist')
        cy.contains('Product is not available').should('not.exist')
    })

    it('mantiene el carrito y deja que el servidor resuelva el precio actualizado', () => {
        let serverPrice = 25
        installPublicCatalog({ isAvailable: true, price: serverPrice })
        cy.intercept('POST', '**/api/v1/businesses/*/orders', (request) => {
            request.alias = 'createOrder'
            expect(request.body.items).to.deep.equal([{ productId, quantity: 1, optionIds: [] }])
            expect(request.body).not.to.have.property('price')
            request.reply({
                statusCode: 201,
                body: {
                    order: {
                        id: 'order-product-lifecycle-e2e',
                        orderNumber: 31,
                        status: 'PENDING',
                        total: serverPrice,
                    },
                },
            })
        })

        cy.visit(`/${slug}`)
        cy.wait('@getPublicCatalog')
        stubWhatsApp()
        openOrder()

        // Simula que el restaurante edita el precio después de que el cliente agregó el producto.
        serverPrice = 35
        cy.contains('button', 'Confirmar pedido').click()
        cy.wait('@createOrder')
        cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
            .should('be.visible')
            .and('contain', '¡Pedido enviado!')
    })
})

export {}
