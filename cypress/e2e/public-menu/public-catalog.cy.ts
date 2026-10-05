type PublicOption = {
    id: string
    optionGroupId: string
    name: string
    price: number
    sortOrder: number
    isAvailable: boolean
}

type PublicProduct = {
    id: string
    businessId: string
    categoryId: string
    name: string
    description: string | null
    price: number
    imageUrl: string | null
    sortOrder: number
    isAvailable: boolean
    optionGroups: {
        id: string
        productId: string
        name: string
        isRequired: boolean
        minSelections: number
        maxSelections: number
        sortOrder: number
        isActive: boolean
        options: PublicOption[]
    }[]
}

const slug = 'cocina-de-luna'
const catalog = {
    business: {
        id: 'business-public-e2e',
        name: 'Cocina de Luna',
        slug,
        description: 'Sabores caseros preparados al momento.',
        logoUrl: 'https://cdn.example.com/cocina-de-luna-logo.webp',
        logoBlurUrl: null,
        coverUrl: 'https://cdn.example.com/cocina-de-luna-cover.webp',
        coverBlurUrl: null,
        ubication: 'Culiacán, Sinaloa',
        ubicationMaps: null,
        businessSchedule: {
            days: [
                { key: 'monday', label: 'Lun', enabled: true },
                { key: 'tuesday', label: 'Mar', enabled: true },
                { key: 'wednesday', label: 'Mié', enabled: true },
                { key: 'thursday', label: 'Jue', enabled: false },
            ],
            openTime: '10:00',
            closeTime: '22:00',
            isClosed: false,
        },
        whatsappNumber: '+526671234567',
    },
    menus: [
        {
            id: 'menu-principal-public-e2e',
            businessId: 'business-public-e2e',
            name: 'Menú principal',
            description: 'Nuestros platos favoritos.',
            isActive: true,
            categories: [
                {
                    id: 'category-tacos-public-e2e',
                    businessId: 'business-public-e2e',
                    menuId: 'menu-principal-public-e2e',
                    name: 'Tacos',
                    description: 'Tacos hechos al momento.',
                    sortOrder: 0,
                    isActive: true,
                    products: [
                        {
                            id: 'product-taco-public-e2e',
                            businessId: 'business-public-e2e',
                            categoryId: 'category-tacos-public-e2e',
                            name: 'Taco de asada',
                            description: 'Tortilla, asada y cebolla.',
                            price: 89,
                            imageUrl: 'https://cdn.example.com/taco.webp',
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [
                                {
                                    id: 'group-extras-public-e2e',
                                    productId: 'product-taco-public-e2e',
                                    name: 'Extras',
                                    isRequired: true,
                                    minSelections: 1,
                                    maxSelections: 2,
                                    sortOrder: 0,
                                    isActive: true,
                                    options: [
                                        {
                                            id: 'option-aguacate-public-e2e',
                                            optionGroupId: 'group-extras-public-e2e',
                                            name: 'Aguacate',
                                            price: 20,
                                            sortOrder: 0,
                                            isAvailable: true,
                                        },
                                        {
                                            id: 'option-tocino-public-e2e',
                                            optionGroupId: 'group-extras-public-e2e',
                                            name: 'Tocino',
                                            price: 25,
                                            sortOrder: 1,
                                            isAvailable: true,
                                        },
                                    ],
                                },
                            ],
                        },
                    ] satisfies PublicProduct[],
                },
                {
                    id: 'category-bebidas-public-e2e',
                    businessId: 'business-public-e2e',
                    menuId: 'menu-principal-public-e2e',
                    name: 'Bebidas',
                    description: 'Opciones frías para acompañar.',
                    sortOrder: 1,
                    isActive: true,
                    products: [
                        {
                            id: 'product-agua-public-e2e',
                            businessId: 'business-public-e2e',
                            categoryId: 'category-bebidas-public-e2e',
                            name: 'Agua fresca',
                            description: 'Jamaica o limón.',
                            price: 35,
                            imageUrl: null,
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [],
                        },
                    ],
                },
                {
                    id: 'category-hidden-public-e2e',
                    businessId: 'business-public-e2e',
                    menuId: 'menu-principal-public-e2e',
                    name: 'Categoría oculta',
                    description: null,
                    sortOrder: 2,
                    isActive: false,
                    products: [],
                },
            ],
        },
        {
            id: 'menu-postres-public-e2e',
            businessId: 'business-public-e2e',
            name: 'Postres',
            description: 'Algo dulce para terminar.',
            isActive: true,
            categories: [
                {
                    id: 'category-postres-public-e2e',
                    businessId: 'business-public-e2e',
                    menuId: 'menu-postres-public-e2e',
                    name: 'Postres',
                    description: 'Preparados en casa.',
                    sortOrder: 0,
                    isActive: true,
                    products: [
                        {
                            id: 'product-flan-public-e2e',
                            businessId: 'business-public-e2e',
                            categoryId: 'category-postres-public-e2e',
                            name: 'Flan de vainilla',
                            description: 'Porción individual.',
                            price: 55,
                            imageUrl: null,
                            sortOrder: 0,
                            isAvailable: true,
                            optionGroups: [],
                        },
                    ],
                },
            ],
        },
        {
            id: 'menu-inactive-public-e2e',
            businessId: 'business-public-e2e',
            name: 'Menú privado',
            description: 'No debe publicarse.',
            isActive: false,
            categories: [],
        },
    ],
}

function installPublicCatalogApi() {
    cy.intercept('GET', `**/api/v1/public/businesses/${slug}/catalog`, {
        statusCode: 200,
        body: catalog,
    }).as('getPublicCatalog')
}

describe('Catálogo público', () => {
    it('muestra el negocio, menús, categorías, productos, precios y opciones sin autenticación', () => {
        installPublicCatalogApi()

        cy.visit(`/menu/${slug}`)
        cy.wait('@getPublicCatalog')

        cy.get('body').should('not.contain', 'Iniciar sesión')
        cy.get('img[alt="Logo de Cocina de Luna"]')
            .should('be.visible')
            .and('have.attr', 'src', catalog.business.logoUrl)
        cy.get('img[alt="Portada de Cocina de Luna"]')
            .should('be.visible')
            .and('have.attr', 'src', catalog.business.coverUrl)

        cy.contains('h1', 'Cocina de Luna').should('be.visible')
        cy.contains('Sabores caseros preparados al momento.').should('be.visible')
        cy.contains('Culiacán, Sinaloa').should('be.visible')
        cy.contains('Horario disponible').should('be.visible')
        cy.contains('Lun · Mar · Mié').should('be.visible')
        cy.contains('10:00–22:00').should('be.visible')

        cy.get('section[aria-label="Menús"]')
            .should('contain', 'Menú principal')
            .and('contain', 'Postres')
            .and('not.contain', 'Menú privado')
        cy.contains('p', 'Nuestros platos favoritos.').should('be.visible')

        cy.get('nav[aria-label="Categorías del menú"]')
            .should('contain', 'Tacos')
            .and('contain', 'Bebidas')
            .and('not.contain', 'Categoría oculta')
        cy.get('#category-category-tacos-public-e2e')
            .should('be.visible')
            .and('contain', 'Tacos hechos al momento.')
        cy.get('#category-category-bebidas-public-e2e').should('be.visible')

        cy.get('article')
            .should('contain', 'Taco de asada')
            .and('contain', 'Tortilla, asada y cebolla.')
            .and('contain', '$89.00')
        cy.get('article')
            .find('img[alt=""]')
            .should('have.attr', 'src', 'https://cdn.example.com/taco.webp')

        cy.contains('button', 'Seleccionar opciones').click()
        cy.get('[role="dialog"][aria-labelledby="customize-title"]')
            .should('be.visible')
            .within(() => {
                cy.contains('h2', 'Taco de asada').should('be.visible')
                cy.contains('Precio base:').should('contain', '$89.00')
                cy.contains('legend', 'Extras').should('contain', 'Mínimo 1 · máximo 2')
                cy.contains('Aguacate').should('be.visible')
                cy.contains('Tocino').should('be.visible')
                cy.get('button[aria-label="Agregar Aguacate"]').click()
                cy.contains('button', 'Agregar al pedido').should('not.be.disabled').click()
            })

        cy.contains('button', 'Ver mi pedido').should('contain', '1 producto').click()
        cy.get('[role="dialog"][aria-labelledby="order-title"]')
            .should('be.visible')
            .and('contain', 'Taco de asada')
            .and('contain', 'Extras: Aguacate')
            .and('contain', '$109')
    })

    it('permite cambiar de menú y conserva una composición usable en móvil', () => {
        installPublicCatalogApi()

        cy.viewport(390, 844)
        cy.visit(`/menu/${slug}`)
        cy.wait('@getPublicCatalog')

        cy.get('section[aria-label="Menús"] button').contains('Postres').click()
        cy.contains('p', 'Algo dulce para terminar.').should('be.visible')
        cy.get('nav[aria-label="Categorías del menú"]').contains('Postres').should('be.visible')
        cy.get('#category-category-postres-public-e2e')
            .should('be.visible')
            .and('contain', 'Flan de vainilla')
            .and('contain', '$55.00')

        cy.get('body').should(($body) => {
            expect($body[0].scrollWidth).to.be.lte($body[0].clientWidth)
        })
        cy.get('h1').should('be.visible')
        cy.get('section[aria-label="Menús"]').should('be.visible')
        cy.get('nav[aria-label="Categorías del menú"]').should('be.visible')
    })
})

export {}
