import {
    configureWhatsapp,
    createBusiness,
    createMenuAndCategory,
    createProduct,
    newAccountEmail,
    registerAndLogin,
    stubWhatsappWindow,
    uniqueSuffix,
    watchRealBackendRequests,
} from '../../support/realBackendFlow'

// Humo con backend real (sin respuestas simuladas): crea productos y un combo con opciones,
// lo pide desde el menú público eligiendo una opción y lo ve en el dashboard.
// Se salta si no hay contraseña de registro (CYPRESS_TEST_REGISTER_PASSWORD).

const burger = { name: 'Hamburguesa Humo', description: 'Carne y queso.', price: 95 }
const fries = { name: 'Papas Humo', description: 'Papas gajo.', price: 35 }
const wings = { name: 'Alitas Humo', description: 'Alitas con salsa.', price: 70 }
const combo = {
    name: 'Combo Humo',
    description: 'Hamburguesa con acompañamiento a elegir.',
    price: 129,
}

function comboDialog() {
    return cy.get('[data-testid="combo-creation-dialog"]')
}

function createCombo() {
    cy.contains('button', 'Agregar producto').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Combo').click()
    cy.get('[data-testid="product-type-dialog"]').contains('button', 'Continuar con combo').click()

    comboDialog().within(() => {
        cy.get('input[placeholder="Nombre del combo"]').type(combo.name)
        cy.get('textarea[placeholder="Describe brevemente qué ofrece este combo"]').type(
            combo.description,
        )
        cy.contains('label', 'Precio').find('input').type(String(combo.price))
        cy.contains('button', 'Continuar').click()
    })
    comboDialog()
        .should('contain', 'Productos incluidos')
        .within(() => {
            cy.contains('button', burger.name).click()
            cy.contains('button', 'Continuar').click()
        })
    comboDialog()
        .should('contain', 'Opciones para el cliente')
        .within(() => {
            cy.contains('button', fries.name).click()
            cy.contains('button', wings.name).click()
            cy.get('input[aria-label="Nombre del grupo"]').type('Acompañamiento')
            cy.contains('button', 'Agregar grupo al combo').click()
            cy.contains('button', 'Continuar').click()
        })
    comboDialog()
        .should('contain', 'Revisa tu combo')
        .and('contain', burger.name)
        .and('contain', 'Acompañamiento')
        .within(() => cy.contains('button', 'Crear combo').click())
    cy.wait('@createCombo').its('response.statusCode').should('be.oneOf', [200, 201])
    cy.contains('Combo creado').should('be.visible')
    comboDialog().should('not.exist')
}

describe('Humo · combo con opciones, pedido público y dashboard', () => {
    it('crea un combo, lo pide eligiendo una opción y lo muestra en la orden', function () {
        cy.env(['testRegisterEmail', 'testRegisterPassword']).then(function ({
            testRegisterEmail,
            testRegisterPassword,
        }) {
            if (!testRegisterPassword) {
                this.skip()
                return
            }
            const suffix = uniqueSuffix()
            const credentials = {
                email: newAccountEmail('combo', suffix, testRegisterEmail),
                password: testRegisterPassword,
            }
            const slug = `cb-${suffix}`
            const customer = `Cliente Combo ${suffix.slice(-4)}`

            watchRealBackendRequests()
            registerAndLogin(credentials)
            createBusiness(slug)
            createMenuAndCategory({ menu: 'Menú humo', category: 'Platillos' })
            createProduct(burger)
            createProduct(fries)
            createProduct(wings)
            configureWhatsapp()
            createCombo()
            cy.contains(combo.name).should('be.visible')
            cy.contains('COMBO').should('be.visible')

            // Cliente: abre el menú público, elige la opción y confirma el pedido.
            cy.visit(`/${slug}`)
            cy.contains(combo.name, { timeout: 15_000 }).should('be.visible')
            stubWhatsappWindow()
            cy.contains('article', combo.name).contains('button', 'Seleccionar opciones').click()
            cy.get('[role="dialog"][aria-labelledby="customize-title"]').within(() => {
                cy.contains('label', fries.name).click()
                cy.contains('button', 'Agregar al pedido').click()
            })
            cy.contains('button', 'Ver mi pedido').click()
            cy.get('#customer-name').type(customer)
            cy.get('#customer-phone').type('669-555-0143')
            cy.contains('[role="dialog"] button', 'Confirmar pedido').click()
            cy.wait('@createOrder').then(({ request, response }) => {
                expect(response?.statusCode).to.be.oneOf([200, 201])
                expect(request.body.items).to.have.length(1)
                expect(request.body.items[0].comboChoiceIds).to.have.length(1)
            })
            cy.get('[role="dialog"][aria-labelledby="order-confirmation-title"]')
                .should('be.visible')
                .and('contain', '¡Tu pedido está listo!')

            // Dueño: la orden aparece en el dashboard con el combo y la opción elegida.
            cy.visit('/dashboard/orders')
            cy.contains('article', customer, { timeout: 15_000 }).should('contain', 'Pendiente')
            cy.contains('article', customer).find('button').first().click()
            cy.get('[role="dialog"][aria-labelledby="order-detail-title"]', { timeout: 15_000 })
                .should('be.visible')
                .and('contain', combo.name)
                .and('contain', fries.name)
        })
    })
})
