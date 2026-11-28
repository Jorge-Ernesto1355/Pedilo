import {
    currentBusinessId,
    installEventStream,
    installInventoryApi,
    loginAsSeedOwner,
    newInventoryState,
    stockAlertFrame,
    type InventoryApiState,
} from '../../support/inventory-fixtures'

type Stream = { frames: string[]; connections: number }

const toasts = () => cy.get('[data-testid="stock-alert-toast"]')

/**
 * Opens a page with the order stream mocked. The stream closes after every
 * response and the client reconnects, so frames queued in `stream.frames` reach
 * the browser on its next connection.
 */
function openWith(path: string, state: InventoryApiState, stream: Stream) {
    loginAsSeedOwner()
    cy.then(() => {
        installInventoryApi(state)
        installEventStream(stream)
    })
    cy.visit(path)
    cy.wait('@eventStream')
}

function deliver(stream: Stream, ...frames: string[]) {
    cy.then(() => stream.frames.push(...frames))
}

describe('Inventario · avisos en tiempo real', () => {
    let businessId: string
    const stream: Stream = { frames: [], connections: 0 }

    beforeEach(() => {
        stream.frames = []
        stream.connections = 0
        loginAsSeedOwner()
        currentBusinessId().then((id) => {
            businessId = id
        })
    })

    it('avisa de stock bajo en cualquier pantalla, con la cantidad que queda', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        deliver(
            stream,
            stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }),
        )

        toasts().should('have.length', 1)
        toasts().first().should('have.attr', 'data-level', 'LOW').and('contain', 'Stock bajo: Queso').and('contain', 'Quedan 180 g')
        cy.location('pathname').should('eq', '/dashboard/orders')
    })

    it('distingue stock crítico, agotado y consumo alto', () => {
        openWith('/dashboard/products', newInventoryState(), stream)
        deliver(
            stream,
            stockAlertFrame({ alertId: 'alert-critical', ingredientName: 'Tocino', level: 'CRITICAL', stock: 80, restaurantId: businessId }),
            stockAlertFrame({ alertId: 'alert-out', ingredientName: 'Pan', unit: 'UNIT', level: 'OUT', stock: 0, restaurantId: businessId }),
            stockAlertFrame({ alertId: 'alert-high', ingredientName: 'Carne', kind: 'CONSUMPTION', level: 'HIGH', stock: 700, restaurantId: businessId }),
        )

        toasts().should('have.length', 3)
        cy.contains('[data-testid="stock-alert-toast"]', 'Stock crítico: Tocino').should('have.attr', 'data-level', 'CRITICAL')
        cy.contains('[data-testid="stock-alert-toast"]', 'Agotado: Pan').should('contain', 'Ya no queda stock.')
        cy.contains('[data-testid="stock-alert-toast"]', 'Consumo alto: Carne').should('contain', 'Se está usando más de lo normal')
    })

    it('reemplaza el aviso de un ingrediente cuando empeora, sin duplicarlo', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        deliver(stream, stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }))
        toasts().should('have.length', 1).and('have.attr', 'data-level', 'LOW')

        deliver(stream, stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'CRITICAL', stock: 90, restaurantId: businessId }))
        toasts().should('have.length', 1).and('have.attr', 'data-level', 'CRITICAL').and('contain', 'Stock crítico: Queso')
    })

    it('no repite un aviso que ya se mostró', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        const frame = stockAlertFrame({ alertId: 'alert-dup', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }, 'event-dup')
        deliver(stream, frame)
        toasts().should('have.length', 1)
        cy.get('[data-testid="stock-alert-toast"] button[aria-label="Cerrar aviso de inventario"]').click()
        toasts().should('not.exist')

        // El mismo evento reenviado tras cerrar vuelve a mostrarse: el cierre es del usuario, no una deduplicación global.
        deliver(stream, frame)
        toasts().should('have.length', 1)
    })

    it('muestra como máximo tres avisos a la vez, los más recientes', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        deliver(
            stream,
            ...['uno', 'dos', 'tres', 'cuatro'].map((name, index) =>
                stockAlertFrame({ alertId: `alert-${name}`, ingredientName: `Ingrediente ${name}`, level: 'LOW', stock: 10 + index, restaurantId: businessId }),
            ),
        )

        toasts().should('have.length', 3)
        cy.contains('[data-testid="stock-alert-toast"]', 'Ingrediente uno').should('not.exist')
        cy.contains('[data-testid="stock-alert-toast"]', 'Ingrediente cuatro').should('be.visible')
    })

    it('cierra el aviso con el botón y lleva al inventario con el enlace', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        deliver(stream, stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }))

        toasts().find('button[aria-label="Cerrar aviso de inventario"]').click()
        toasts().should('not.exist')

        deliver(stream, stockAlertFrame({ alertId: 'alert-2', ingredientName: 'Pan', unit: 'UNIT', level: 'OUT', stock: 0, restaurantId: businessId }))
        toasts().contains('a', 'Ver inventario').click()
        cy.location('pathname').should('eq', '/dashboard/inventory')
        toasts().should('not.exist')
    })

    it('ignora eventos de otro negocio o con datos inválidos', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        deliver(
            stream,
            stockAlertFrame({ alertId: 'alert-other', ingredientName: 'Ajeno', level: 'LOW', stock: 1, restaurantId: 'business-otro' }),
            stockAlertFrame({ alertId: 'alert-bad', ingredientName: 'Inválido', level: 'GIGANTE' as never, stock: 1, restaurantId: businessId }),
            'event: stock_alert\ndata: {no es json}\n\n',
            stockAlertFrame({ alertId: 'alert-ok', ingredientName: 'Válido', level: 'LOW', stock: 5, restaurantId: businessId }),
        )

        toasts().should('have.length', 1).and('contain', 'Válido')
        cy.contains('Ajeno').should('not.exist')
        cy.contains('Inválido').should('not.exist')
    })

    it('actualiza el badge de la navegación y la lista al llegar una alerta', () => {
        const state = newInventoryState()
        openWith('/dashboard/inventory', state, stream)
        cy.get('[data-testid="inventory-alert-badge"]').should('not.exist')

        cy.then(() => {
            state.alerts = [
                { id: 'alert-1', ingredientId: 'ing-queso', ingredientName: 'Queso', unit: 'G', kind: 'STOCK', level: 'LOW', stock: 180, createdAt: '2026-11-19T18:00:00.000Z' },
            ]
            state.ingredients[0].stock = 180
        })
        deliver(stream, stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }))

        toasts().should('contain', 'Stock bajo: Queso')
        cy.get('[data-testid="inventory-alert-badge"]').should('contain', '1')
        cy.get('[data-testid="ingredient-row"][data-ingredient="Queso"] [data-testid="stock-level"]').should('have.attr', 'data-level', 'LOW')
    })

    it('oculta el aviso solo tras unos segundos', () => {
        openWith('/dashboard/orders', newInventoryState(), stream)
        cy.clock()
        deliver(stream, stockAlertFrame({ alertId: 'alert-1', ingredientName: 'Queso', level: 'LOW', stock: 180, restaurantId: businessId }))
        // El reloj falso detiene la reconexión: se avanza para que llegue el evento.
        cy.tick(3_000)
        toasts().should('have.length', 1)

        cy.tick(11_000)
        toasts().should('have.length', 1)
        cy.tick(2_000)
        toasts().should('not.exist')
    })
})
