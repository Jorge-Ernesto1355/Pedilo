/**
 * Flujo completo contra el backend real: ingrediente → receta → pedido → listo →
 * stock descontado → alertas → bloqueo de ventas.
 *
 * Crea pedidos reales (se cuentan en ventas), por eso solo corre con
 * CYPRESS_INVENTORY_REAL_BACKEND=true y contra una base desechable con
 * `npm run e2e:seed` ejecutado y las migraciones de inventario aplicadas.
 */
import { currentBusinessId, loginAsSeedOwner } from '../../support/inventory-fixtures'

type Target = { api: string; businessId: string; origin: string }

const dialog = () => cy.get('[role="dialog"]')
const row = (name: string) => cy.get(`[data-testid="ingredient-row"][data-ingredient="${name}"]`)

function target(): Cypress.Chainable<Target> {
    return cy.env(['backendUrl']).then(({ backendUrl }) =>
        currentBusinessId().then((businessId) => ({
            api: `${String(backendUrl).replace(/\/$/, '')}/api/v1`,
            businessId,
            origin: Cypress.config('baseUrl') as string,
        })),
    )
}

describe('Inventario · flujo completo con backend real', () => {
    const suffix = Date.now().toString(36)
    const meat = `Carne E2E ${suffix}`
    let t: Target
    let product: { id: string; name: string }
    let ingredientId: string

    before(function () {
        cy.env(['inventoryRealBackend']).then(({ inventoryRealBackend }) => {
            if (!inventoryRealBackend) this.skip()
        })
        loginAsSeedOwner()
        target().then((found) => {
            t = found
            cy.request<{ products: { id: string; name: string }[] }>(
                `${t.api}/businesses/${t.businessId}/products?page=1&limit=1`,
            ).then((response) => {
                product = response.body.products[0]
            })
        })
    })

    beforeEach(() => loginAsSeedOwner())

    after(() => {
        if (!ingredientId || !t) return
        // Archivar quita el ingrediente de recetas y alertas.
        cy.request({
            method: 'DELETE',
            url: `${t.api}/businesses/${t.businessId}/inventory/ingredients/${ingredientId}`,
            headers: { Origin: t.origin },
            failOnStatusCode: false,
        })
        cy.request({
            method: 'PATCH',
            url: `${t.api}/businesses/${t.businessId}/inventory/settings`,
            headers: { Origin: t.origin },
            body: { blockMode: 'NONE' },
            failOnStatusCode: false,
        })
    })

    const staffOrder = (quantity: number) =>
        cy.request({
            method: 'POST',
            url: `${t.api}/businesses/${t.businessId}/orders/restaurant`,
            headers: { Origin: t.origin, 'Idempotency-Key': `e2e-inventory-${suffix}-${Date.now()}-${quantity}` },
            body: { customerName: 'Cliente E2E', customerPhone: null, items: [{ productId: product.id, quantity, optionIds: [] }] },
        })

    const setStatus = (orderId: string, status: string) =>
        cy.request({
            method: 'PATCH',
            url: `${t.api}/businesses/orders/${orderId}/status`,
            headers: { Origin: t.origin },
            body: { status },
        })

    it('crea un ingrediente desde la pantalla de inventario', () => {
        cy.visit('/dashboard/inventory')
        cy.contains('h1', 'Inventario').should('be.visible')
        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.get('input[name="name"]').type(meat)
            cy.get('input[name="initialStock"]').type('1000')
            cy.contains('button', 'Crear ingrediente').click()
        })
        dialog().should('not.exist')
        row(meat).should('contain', '1 kg').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'OK')

        cy.request<{ ingredients: { id: string; name: string }[] }>(
            `${t.api}/businesses/${t.businessId}/inventory/ingredients?search=${encodeURIComponent(meat)}`,
        ).then((response) => {
            ingredientId = response.body.ingredients.find((item) => item.name === meat)!.id
        })
    })

    it('define la receta del producto desde su formulario', () => {
        cy.visit('/dashboard/products')
        cy.get(`button[aria-label="Editar ${product.name}"]:visible`, { timeout: 20_000 }).click()
        dialog().within(() => {
            cy.contains('button', 'Agregar ingredientes').click()
            cy.get('input[aria-label="Buscar ingrediente"]').type(meat)
            cy.get('[role="option"]').contains(meat).click()
            cy.get('[data-testid="recipe-line"]').first().find('input[aria-label^="Cantidad"]').type('150')
            cy.contains('button', 'Guardar receta').click()
        })
        cy.contains('Receta guardada').should('be.visible')
    })

    it('descuenta el stock solo cuando el pedido pasa a listo y avisa del consumo alto', () => {
        staffOrder(2).then((response) => {
            const orderId = response.body.order.id as string

            setStatus(orderId, 'PREPARING')
            cy.visit('/dashboard/inventory')
            row(meat).find('[data-testid="ingredient-stock"]').should('have.text', '1 kg')

            setStatus(orderId, 'READY')
            cy.reload()
            // 2 × 150 g descontados de 1 kg.
            row(meat).find('[data-testid="ingredient-stock"]').should('have.text', '700 g')
            // 300 g de 1 kg en la ventana: 30% ≥ 20%.
            row(meat).should('contain', 'Consumo alto')
            cy.get('[data-testid="inventory-alert-badge"]').should('exist')
        })
    })

    it('registra el pedido en el historial del ingrediente', () => {
        cy.visit('/dashboard/inventory')
        cy.get(`button[aria-label="Historial de ${meat}"]:visible`).click()
        dialog().within(() => {
            cy.get('[data-testid="movement-list"] li').first().should('contain', 'Pedido').and('contain', '-300 g').and('contain', 'Quedó en 700 g')
            cy.get('[data-testid="movement-list"] li').last().should('contain', 'Compra').and('contain', 'Stock inicial')
        })
    })

    it('un pedido cancelado nunca descuenta stock', () => {
        staffOrder(1).then((response) => setStatus(response.body.order.id as string, 'CANCELLED'))
        cy.visit('/dashboard/inventory')
        row(meat).find('[data-testid="ingredient-stock"]').should('have.text', '700 g')
    })

    it('bloquea pedidos del menú público cuando falta stock, pero no los del personal', () => {
        cy.visit('/dashboard/inventory')
        cy.contains('button', 'Configuración').click()
        dialog().within(() => {
            cy.get('input[name="blockMode"][value="OUT_OF_STOCK"]').check()
            cy.contains('button', 'Guardar configuración').click()
        })
        dialog().should('not.exist')

        // 100 × 150 g = 15 kg, más de lo que hay.
        cy.request({
            method: 'POST',
            url: `${t.api}/businesses/${t.businessId}/orders`,
            headers: { Origin: t.origin },
            failOnStatusCode: false,
            body: { customer: { name: 'Cliente', phone: '6691236382' }, items: [{ productId: product.id, quantity: 100, optionIds: [] }] },
        }).then((response) => {
            expect(response.status).to.eq(409)
            expect(response.body.error.code).to.eq('INSUFFICIENT_STOCK')
            expect(response.body.error.message).to.contain(meat)
        })

        // El personal puede registrar el pedido de todos modos.
        staffOrder(100).its('status').should('eq', 201)
    })
})
