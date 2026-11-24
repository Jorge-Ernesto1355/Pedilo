import {
    currentBusinessId,
    installInventoryApi,
    loginAsSeedOwner,
    newInventoryState,
    type InventoryApiState,
} from '../../support/inventory-fixtures'

type Backend = { url: string; businessId: string }

const dialog = () => cy.get('[role="dialog"]')
const lines = () => cy.get('[data-testid="recipe-line"]')
const searchBox = () => cy.get('input[aria-label="Buscar ingrediente"]')
/** Searches an ingredient by name and picks it from the list. */
const addIngredient = (name: string) => {
    searchBox().clear().type(name)
    cy.get('[role="option"]').contains(name).click()
}

function backend(): Cypress.Chainable<Backend> {
    return cy.env(['backendUrl']).then(({ backendUrl }) =>
        currentBusinessId().then((businessId) => ({
            url: `${String(backendUrl).replace(/\/$/, '')}/api/v1`,
            businessId,
        })),
    )
}

/** First real product of the seeded business (npm run e2e:seed). */
function firstProduct({ url, businessId }: Backend) {
    return cy
        .request<{ products: { id: string; name: string }[] }>(
            `${url}/businesses/${businessId}/products?page=1&limit=1`,
        )
        .then((response) => response.body.products[0])
}

function openProductEditor(state: InventoryApiState, productName: string) {
    cy.then(() => installInventoryApi(state))
    cy.intercept('GET', /\/businesses\/products\/[^/?]+(\?.*)?$/).as('productDetail')
    cy.visit('/dashboard/products')
    cy.get(`button[aria-label="Editar ${productName}"]:visible`, { timeout: 20_000 }).click()
    dialog().contains('h2', 'Editar producto').should('be.visible')
    // La página vuelve a montar el modal cuando llega el detalle del producto; hay que
    // esperar a que termine para no escribir en un formulario que se va a reemplazar.
    cy.wait('@productDetail')
    cy.contains('Cargando grupos…').should('not.exist')
    cy.contains('Cargando opciones…').should('not.exist')
}

describe('Inventario · recetas de productos', () => {
    let product: { id: string; name: string }

    beforeEach(() => {
        loginAsSeedOwner()
        backend()
            .then(firstProduct)
            .then((found) => {
                product = found
            })
    })

    it('arma la receta de un producto y la guarda con las cantidades por unidad vendida', () => {
        const state = newInventoryState()
        openProductEditor(state, product.name)

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.contains('h3', 'Ingredientes').should('be.visible')
            cy.contains('Sin receta: este elemento no descuenta inventario.').should('be.visible')
            cy.get('input[aria-label="Buscar ingrediente"]').should('not.exist')
            cy.contains('button', 'Agregar ingredientes').click()

            addIngredient('Carne')
            lines().eq(0).find('input[aria-label^="Cantidad"]').type('150')
            lines().eq(0).should('contain', 'g')

            addIngredient('Pan')
            lines().eq(1).find('input[aria-label^="Cantidad"]').type('1')
            lines().eq(1).should('contain', 'pza')

            cy.contains('button', 'Guardar receta').click()
        })

        cy.wait('@setRecipe')
            .its('request.body')
            .should('deep.equal', {
                lines: [
                    { ingredientId: 'ing-carne', quantity: 150 },
                    { ingredientId: 'ing-pan', quantity: 1 },
                ],
            })
        cy.then(() => expect(state.lastRecipe?.key).to.eq(`products/${product.id}`))
        // Al guardar vuelve al resumen, sin inputs.
        dialog().within(() => {
            cy.get('[data-testid="recipe-summary"]').should('contain', '150 g Carne')
            cy.get('[data-testid="recipe-summary"]').should('contain', '1 pza Pan')
            cy.get('input[aria-label^="Cantidad"]').should('not.exist')
            cy.contains('button', 'Guardar receta').should('not.exist')
            cy.contains('button', 'Editar').should('be.visible')
        })
    })

    it('carga una receta existente y permite quitar ingredientes', () => {
        const state = newInventoryState()
        cy.then(() => {
            state.recipes[`products/${product.id}`] = [
                { ingredientId: 'ing-carne', quantity: 150 },
                { ingredientId: 'ing-queso', quantity: 30 },
            ]
        })
        openProductEditor(state, product.name)

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.get('[data-testid="recipe-summary"]').should('contain', '150 g Carne')
            cy.get('[data-testid="recipe-summary"]').should('contain', '30 g Queso')
            cy.get('input[aria-label^="Cantidad"]').should('not.exist')
            cy.contains('button', 'Editar').click()
            lines().should('have.length', 2)
            lines().eq(0).should('contain', 'Carne')
            lines().eq(0).find('input[aria-label^="Cantidad"]').should('have.value', '150')
            lines().eq(1).should('contain', 'Queso')

            cy.get('button[aria-label^="Quitar"]').first().click()
            lines().should('have.length', 1)
            cy.contains('button', 'Guardar receta').click()
        })

        cy.wait('@setRecipe')
            .its('request.body.lines')
            .should('deep.equal', [{ ingredientId: 'ing-queso', quantity: 30 }])
    })

    it('vacía la receta para que el producto deje de descontar inventario', () => {
        const state = newInventoryState()
        cy.then(() => {
            state.recipes[`products/${product.id}`] = [{ ingredientId: 'ing-carne', quantity: 150 }]
        })
        openProductEditor(state, product.name)

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.contains('button', 'Editar').click()
            cy.get('button[aria-label^="Quitar"]').click()
            cy.contains('button', 'Guardar receta').click()
        })
        cy.wait('@setRecipe').its('request.body').should('deep.equal', { lines: [] })
    })

    it('no repite un ingrediente en otra fila', () => {
        openProductEditor(newInventoryState(), product.name)

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.contains('button', 'Agregar ingredientes').click()
            addIngredient('Carne')
            searchBox().clear().type('Car')
            cy.get('[role="option"]').should('not.exist')
            cy.contains('Sin resultados para “Car”.').should('be.visible')
            searchBox().clear().type('Ques')
            cy.get('[role="option"]').should('contain', 'Queso')
        })
    })

    it('exige una cantidad mayor a cero en cada fila', () => {
        openProductEditor(newInventoryState(), product.name)

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.contains('button', 'Agregar ingredientes').click()
            addIngredient('Carne')
            cy.contains('button', 'Guardar receta').click()
            cy.contains('Escribe una cantidad mayor a cero.').should('be.visible')

            lines().eq(0).find('input[aria-label^="Cantidad"]').type('0')
            cy.contains('button', 'Guardar receta').click()
            cy.contains('Escribe una cantidad mayor a cero.').should('be.visible')
        })
        cy.get('@setRecipe.all').should('have.length', 0)
    })

    it('muestra el error del servidor sin perder lo escrito', () => {
        const state = newInventoryState()
        openProductEditor(state, product.name)
        cy.intercept('PUT', '**/inventory/recipes/*/*', {
            statusCode: 400,
            body: {
                error: {
                    code: 'RECIPE_INGREDIENT_INVALID',
                    message: 'Recipe uses an ingredient that is not available',
                },
            },
        }).as('failedRecipe')

        cy.wait('@getRecipe')
        dialog().within(() => {
            cy.contains('button', 'Agregar ingredientes').click()
            addIngredient('Carne')
            lines().eq(0).find('input[aria-label^="Cantidad"]').type('150')
            cy.contains('button', 'Guardar receta').click()
            cy.contains('Recipe uses an ingredient that is not available').should('be.visible')
            lines().eq(0).find('input[aria-label^="Cantidad"]').should('have.value', '150')
        })
    })

    it('invita a crear ingredientes cuando todavía no hay ninguno', () => {
        openProductEditor(newInventoryState({ ingredients: [] }), product.name)

        dialog().within(() => {
            cy.contains('button', 'Agregar ingredientes').click()
            cy.contains('Aún no tienes ingredientes.').should('be.visible')
            cy.contains('a', 'Créalos en Inventario').should(
                'have.attr',
                'href',
                '/dashboard/inventory',
            )
        })
    })
})

describe('Inventario · recetas de opciones', () => {
    const groupName = `Extras inventario ${Date.now().toString(36)}`
    let product: { id: string; name: string }
    let optionId: string

    before(() => {
        loginAsSeedOwner()
        backend().then((target) =>
            firstProduct(target).then((found) => {
                product = found
                cy.request('POST', `${target.url}/businesses/products/${found.id}/option-groups`, {
                    name: groupName,
                    isRequired: false,
                    isActive: true,
                    options: [
                        {
                            name: 'Queso extra',
                            price: 10,
                            minSelections: 0,
                            maxSelections: 1,
                            isAvailable: true,
                        },
                    ],
                }).then((response) => {
                    const group = response.body.optionGroup ?? response.body.group ?? response.body
                    optionId = group.options[0].id
                })
            }),
        )
    })

    beforeEach(() => loginAsSeedOwner())

    it('define lo que gasta una opción, separado de la receta del producto', () => {
        const state = newInventoryState()
        openProductEditor(state, product.name)

        // El producto puede tener grupos de corridas anteriores: se acota al grupo propio.
        dialog().contains('h5', groupName).should('be.visible')
        dialog()
            .contains('h5', groupName)
            .closest('.rounded-xl')
            .within(() => {
                cy.contains('button', 'Ingredientes').click()
            })
        // La receta del producto se pide primero; aquí importa la de la opción.
        cy.get('@getRecipe.all').should((calls) => {
            const urls = (calls as unknown as { request: { url: string } }[]).map(
                (call) => call.request.url,
            )
            expect(urls.some((url) => url.includes(`/recipes/product-options/${optionId}`))).to.eq(
                true,
            )
        })
        dialog().within(() => {
            cy.contains('h5', groupName)
                .closest('.rounded-xl')
                .find('[data-testid="recipe-editor"]')
                .within(() => {
                    cy.contains('button', 'Agregar ingredientes').click()
                    addIngredient('Queso')
                    lines().eq(0).find('input[aria-label^="Cantidad"]').type('30')
                    cy.contains('button', 'Guardar receta').click()
                })
        })

        cy.wait('@setRecipe').then(({ request }) => {
            expect(request.url).to.include(`/recipes/product-options/${optionId}`)
            expect(request.body).to.deep.equal({
                lines: [{ ingredientId: 'ing-queso', quantity: 30 }],
            })
        })
    })
})
