import {
    installInventoryApi,
    loginAsSeedOwner,
    newInventoryState,
    type InventoryApiState,
} from '../../support/inventory-fixtures'

function visitInventory(state: InventoryApiState) {
    loginAsSeedOwner()
    cy.then(() => installInventoryApi(state))
    cy.visit('/dashboard/inventory')
    cy.wait('@listIngredients')
    cy.contains('h1', 'Inventario').should('be.visible')
}

const rows = () => cy.get('[data-testid="ingredient-row"]')
const dialog = () => cy.get('[role="dialog"]')
const rowOf = (name: string) => cy.get(`[data-testid="ingredient-row"][data-ingredient="${name}"]`)

describe('Inventario · lista y estados', () => {
    it('ordena lo más urgente primero y muestra el estado de cada ingrediente', () => {
        visitInventory(newInventoryState())

        rows().should('have.length', 4)
        rows().then(($rows) => {
            const names = [...$rows].map((row) => row.getAttribute('data-ingredient'))
            // Agotado, crítico, bajo y normal, en ese orden.
            expect(names).to.deep.equal(['Pan', 'Tocino', 'Carne', 'Queso'])
        })
        rowOf('Pan').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'OUT').and('contain', 'Agotado')
        rowOf('Tocino').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'CRITICAL').and('contain', 'Crítico')
        rowOf('Carne').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'LOW').and('contain', 'Bajo')
        rowOf('Queso').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'OK').and('contain', 'Normal')
    })

    it('muestra cantidades legibles y a partir de qué cantidad avisa', () => {
        visitInventory(newInventoryState())

        rowOf('Queso').find('[data-testid="ingredient-stock"]').should('have.text', '900 g')
        // 20% de 1 kg.
        rowOf('Queso').should('contain', '200 g')
        rowOf('Pan').find('[data-testid="ingredient-stock"]').should('have.text', '0 pza')
    })

    it('abrevia cantidades grandes en kg', () => {
        const state = newInventoryState()
        state.ingredients[0].stock = 2500
        state.ingredients[0].parLevel = 5000
        visitInventory(state)

        rowOf('Queso').find('[data-testid="ingredient-stock"]').should('have.text', '2.5 kg')
    })

    it('cuenta los ingredientes por estado en los filtros', () => {
        visitInventory(newInventoryState())

        cy.get('[data-testid="inventory-filter-ALL"]').should('contain', '4')
        cy.get('[data-testid="inventory-filter-ALERTS"]').should('contain', '3')
        cy.get('[data-testid="inventory-filter-OUT"]').should('contain', '1')
        cy.get('[data-testid="inventory-filter-CRITICAL"]').should('contain', '1')
        cy.get('[data-testid="inventory-filter-LOW"]').should('contain', '1')
        cy.get('[data-testid="inventory-filter-OK"]').should('contain', '1')
    })

    it('filtra por estado pidiendo al servidor solo ese estado', () => {
        visitInventory(newInventoryState())

        cy.get('[data-testid="inventory-filter-OUT"]').click()
        cy.wait('@listIngredients').its('request.url').should('include', 'status=OUT')
        rows().should('have.length', 1).and('contain', 'Pan')
        cy.get('[data-testid="inventory-filter-OUT"]').should('have.attr', 'aria-selected', 'true')

        cy.get('[data-testid="inventory-filter-ALERTS"]').click()
        cy.wait('@listIngredients').its('request.url').should('include', 'status=ALERTS')
        rows().should('have.length', 3)
        cy.contains('Queso').should('not.exist')

        cy.get('[data-testid="inventory-filter-ALL"]').click()
        rows().should('have.length', 4)
    })

    it('busca por nombre y explica cuando nada coincide', () => {
        visitInventory(newInventoryState())

        cy.get('input[aria-label="Buscar ingrediente"]').type('que')
        cy.get('@listIngredients.all').should((calls) =>
            expect((calls as unknown as { request: { url: string } }[]).at(-1)!.request.url).to.include('search=que'),
        )
        rows().should('have.length', 1).and('contain', 'Queso')

        cy.get('input[aria-label="Buscar ingrediente"]').clear().type('zzz')
        cy.contains('Ningún ingrediente coincide con este filtro.').should('be.visible')
    })

    it('invita a crear el primer ingrediente cuando no hay ninguno', () => {
        visitInventory(newInventoryState({ ingredients: [] }))

        cy.contains('h2', 'Aún no registras ingredientes').should('be.visible')
        cy.contains('button', 'Agregar mi primer ingrediente').click()
        dialog().contains('h2', 'Nuevo ingrediente').should('be.visible')
    })

    it('avisa cuando falla la carga y permite reintentar', () => {
        const state = newInventoryState({ failList: true })
        loginAsSeedOwner()
        cy.then(() => installInventoryApi(state))
        cy.visit('/dashboard/inventory')

        cy.contains('No pudimos cargar tu inventario', { timeout: 15_000 }).should('be.visible')
        cy.then(() => {
            state.failList = false
        })
        cy.contains('button', 'Intentar de nuevo').click()
        rows().should('have.length', 4)
    })

    it('muestra un aviso de consumo alto junto al ingrediente afectado', () => {
        const state = newInventoryState()
        state.alerts = [
            {
                id: 'alert-consumption-queso',
                ingredientId: 'ing-queso',
                ingredientName: 'Queso',
                unit: 'G',
                kind: 'CONSUMPTION',
                level: 'HIGH',
                stock: 900,
                createdAt: '2026-11-19T17:00:00.000Z',
            },
        ]
        visitInventory(state)

        rowOf('Queso').should('contain', 'Consumo alto')
        rowOf('Carne').should('not.contain', 'Consumo alto')
    })
})

describe('Inventario · crear, editar y archivar', () => {
    it('crea un ingrediente con su stock y umbral, y lo muestra en la lista', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.get('input[name="name"]').type('  Aguacate ')
            cy.get('select[name="unit"]').select('UNIT')
            cy.get('input[name="initialStock"]').type('40')
            cy.get('input[name="parLevel"]').type('50')
            cy.get('select[name="lowStockMode"]').select('ABSOLUTE')
            cy.get('input[name="lowStockValue"]').type('10')
            cy.get('input[name="consumptionAlertPercent"]').type('35')
            cy.contains('button', 'Crear ingrediente').click()
        })

        cy.wait('@createIngredient').its('request.body').should('deep.equal', {
            name: 'Aguacate',
            unit: 'UNIT',
            initialStock: 40,
            parLevel: 50,
            lowStockMode: 'ABSOLUTE',
            lowStockValue: 10,
            consumptionAlertPercent: 35,
        })
        dialog().should('not.exist')
        rowOf('Aguacate').should('contain', '40 pza').and('contain', '10 pza')
    })

    it('abre el formulario vacío al crear otro ingrediente justo después de crear uno', () => {
        visitInventory(newInventoryState())

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.get('input[name="name"]').type('Aguacate')
            cy.get('select[name="unit"]').select('UNIT')
            cy.get('input[name="initialStock"]').type('40')
            cy.get('input[name="parLevel"]').type('50')
            cy.contains('button', 'Crear ingrediente').click()
        })
        cy.wait('@createIngredient')
        dialog().should('not.exist')

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.get('input[name="name"]').should('have.value', '')
            cy.get('select[name="unit"]').should('have.value', 'G')
            cy.get('input[name="initialStock"]').should('have.value', '')
            cy.get('input[name="parLevel"]').should('have.value', '')
        })
    })

    it('acepta comas decimales y usa el porcentaje del negocio cuando se deja vacío', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.contains('Vacío usa el 20% de tu negocio.').should('be.visible')
            cy.get('input[name="name"]').type('Aceite')
            cy.get('select[name="unit"]').select('ML')
            cy.get('input[name="initialStock"]').type('1,5')
            cy.contains('button', 'Crear ingrediente').click()
        })

        cy.wait('@createIngredient').its('request.body').should((body) => {
            expect(body.initialStock).to.eq(1.5)
            expect(body.unit).to.eq('ML')
            expect(body.lowStockValue).to.eq(null)
            expect(body.consumptionAlertPercent).to.eq(null)
        })
    })

    it('valida los campos antes de enviar', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.contains('button', 'Crear ingrediente').click()
            cy.contains('Escribe el nombre del ingrediente.').should('be.visible')

            cy.get('input[name="name"]').type('Sal')
            // Las letras no entran en un campo de cantidad.
            cy.get('input[name="initialStock"]').type('abc').should('have.value', '')
            cy.get('input[name="lowStockValue"]').type('150')
            cy.contains('button', 'Crear ingrediente').click()
            cy.contains('Usa un número entero entre 1 y 100.').should('be.visible')
        })
        cy.get('@createIngredient.all').should('have.length', 0)
    })

    it('avisa cuando el nombre ya existe sin cerrar el formulario', () => {
        visitInventory(newInventoryState())

        cy.contains('button', 'Nuevo ingrediente').click()
        dialog().within(() => {
            cy.get('input[name="name"]').type('queso')
            cy.contains('button', 'Crear ingrediente').click()
            cy.contains('Ya tienes un ingrediente con este nombre.').should('be.visible')
        })
        dialog().should('be.visible')
    })

    it('edita umbrales sin permitir cambiar la unidad ni el stock inicial', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.get('button[aria-label="Editar Queso"]:visible').click()
        dialog().within(() => {
            cy.contains('h2', 'Editar ingrediente').should('be.visible')
            cy.get('select[name="unit"]').should('be.disabled')
            cy.get('input[name="initialStock"]').should('not.exist')
            cy.get('input[name="name"]').should('have.value', 'Queso')
            cy.get('input[name="parLevel"]').clear().type('2000')
            cy.get('input[name="lowStockValue"]').type('50')
            cy.contains('button', 'Guardar cambios').click()
        })

        cy.wait('@updateIngredient').its('request.body').should('deep.equal', {
            name: 'Queso',
            parLevel: 2000,
            lowStockMode: 'PERCENT',
            lowStockValue: 50,
            consumptionAlertPercent: null,
        })
        // El umbral pasa a 1 kg (50% de 2 kg): 900 g ya queda por debajo y se marca como bajo.
        cy.wait('@listIngredients')
        rowOf('Queso').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'LOW')
        rowOf('Queso').should('contain', '1 kg')
    })

    it('archiva un ingrediente tras confirmar', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.get('button[aria-label="Editar Carne"]:visible').click()
        cy.on('window:confirm', (message) => {
            expect(message).to.contain('Carne')
            return true
        })
        dialog().contains('button', 'Archivar ingrediente').click()

        cy.wait('@archiveIngredient')
        dialog().should('not.exist')
        cy.wait('@listIngredients')
        rows().should('have.length', 3)
        cy.contains('[data-testid="ingredient-row"]', 'Carne').should('not.exist')
    })

    it('no archiva si se cancela la confirmación', () => {
        visitInventory(newInventoryState())

        cy.get('button[aria-label="Editar Carne"]:visible').click()
        cy.on('window:confirm', () => false)
        dialog().contains('button', 'Archivar ingrediente').click()

        cy.get('@archiveIngredient.all').should('have.length', 0)
        dialog().should('be.visible')
    })
})

describe('Inventario · movimientos e historial', () => {
    it('registra una compra y muestra cómo quedará el stock', () => {
        const state = newInventoryState()
        visitInventory(state)

        rowOf('Carne').contains('button', 'Agregar stock').click()
        dialog().within(() => {
            cy.contains('Stock actual: 150 g').should('be.visible')
            cy.get('input[name="quantity"]').type('850')
            cy.get('[data-testid="movement-preview"]').should('contain', '1 kg')
            cy.get('textarea[name="note"]').type('Proveedor del jueves')
            cy.contains('button', 'Registrar').click()
        })

        cy.wait('@recordMovement').its('request.body').should('deep.equal', {
            type: 'PURCHASE',
            quantity: 850,
            note: 'Proveedor del jueves',
        })
        dialog().should('not.exist')
        cy.wait('@listIngredients')
        rowOf('Carne').find('[data-testid="stock-level"]').should('have.attr', 'data-level', 'OK')
    })

    it('registra una merma y avisa si dejaría el stock en negativo', () => {
        visitInventory(newInventoryState())

        rowOf('Tocino').contains('button', 'Conteo o merma').click()
        dialog().within(() => {
            cy.contains('button[role="radio"]', 'Merma').click()
            cy.get('input[name="quantity"]').type('100')
            cy.get('[data-testid="movement-preview"]').should('contain', 'no puede quedar en negativo')
            cy.get('input[name="quantity"]').clear().type('30')
            cy.get('[data-testid="movement-preview"]').should('contain', '50 g')
            cy.contains('button', 'Registrar').click()
        })

        cy.wait('@recordMovement').its('request.body').should('include', { type: 'WASTE', quantity: 30, note: null })
    })

    it('fija el stock con un conteo físico', () => {
        visitInventory(newInventoryState())

        rowOf('Pan').contains('button', 'Conteo o merma').click()
        dialog().within(() => {
            cy.contains('button[role="radio"]', 'Conteo').should('have.attr', 'aria-checked', 'true')
            cy.get('input[name="quantity"]').type('35')
            cy.get('[data-testid="movement-preview"]').should('contain', '35 pza')
            cy.contains('button', 'Registrar').click()
        })

        cy.wait('@recordMovement').its('request.body').should('include', { type: 'ADJUSTMENT', quantity: 35 })
        cy.wait('@listIngredients')
        rowOf('Pan').find('[data-testid="stock-level"]').should('not.have.attr', 'data-level', 'OUT')
    })

    it('exige una cantidad válida', () => {
        visitInventory(newInventoryState())

        rowOf('Carne').contains('button', 'Agregar stock').click()
        dialog().within(() => {
            cy.contains('button', 'Registrar').click()
            cy.contains('Escribe una cantidad mayor a cero.').should('be.visible')
            cy.get('input[name="quantity"]').type('0')
            cy.contains('button', 'Registrar').click()
            cy.contains('Escribe una cantidad mayor a cero.').should('be.visible')
        })
        cy.get('@recordMovement.all').should('have.length', 0)
    })

    it('muestra el historial con entradas, salidas y el stock resultante', () => {
        const state = newInventoryState()
        state.movements = [
            { id: 'm2', ingredientId: 'ing-carne', type: 'CONSUMPTION', quantity: -300, stockAfter: 150, orderId: 'order-1', note: null, createdAt: '2026-11-19T18:00:00.000Z' },
            { id: 'm1', ingredientId: 'ing-carne', type: 'PURCHASE', quantity: 450, stockAfter: 450, orderId: null, note: 'Proveedor', createdAt: '2026-11-18T10:00:00.000Z' },
        ]
        visitInventory(state)

        cy.get('button[aria-label="Historial de Carne"]:visible').click()
        cy.wait('@listMovements')
        dialog().within(() => {
            cy.contains('h2', 'Historial · Carne').should('be.visible')
            cy.get('[data-testid="movement-list"] li').should('have.length', 2)
            cy.get('[data-testid="movement-list"] li').first().should('contain', 'Pedido').and('contain', '-300 g').and('contain', 'Quedó en 150 g')
            cy.get('[data-testid="movement-list"] li').last().should('contain', 'Compra').and('contain', 'Proveedor').and('contain', '+450 g')
        })
    })

    it('explica cuando todavía no hay movimientos', () => {
        visitInventory(newInventoryState())

        cy.get('button[aria-label="Historial de Queso"]:visible').click()
        dialog().contains('Todavía no hay movimientos para este ingrediente.').should('be.visible')
    })
})

describe('Inventario · configuración', () => {
    it('carga la configuración guardada y guarda los cambios', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.contains('button', /^\s*Configuración\s*$/).click()
        dialog().within(() => {
            cy.get('input[name="alertsEnabled"]').should('be.checked')
            cy.get('input[name="defaultLowStockPercent"]').should('have.value', '20')
            cy.get('input[name="consumptionAlertPercent"]').should('have.value', '20')
            cy.get('select[name="consumptionWindowHours"]').should('have.value', '24')
            cy.get('input[name="blockMode"][value="NONE"]').should('be.checked')

            cy.get('input[name="defaultLowStockPercent"]').clear().type('30')
            cy.get('input[name="consumptionAlertPercent"]').clear().type('40')
            cy.get('select[name="consumptionWindowHours"]').select('48')
            cy.get('input[name="blockMode"][value="LOW_STOCK"]').check()
            cy.contains('button', 'Guardar configuración').click()
        })

        cy.wait('@updateSettings').its('request.body').should('deep.equal', {
            alertsEnabled: true,
            defaultLowStockPercent: 30,
            consumptionAlertPercent: 40,
            consumptionWindowHours: 48,
            blockMode: 'LOW_STOCK',
        })
        dialog().should('not.exist')

        // La configuración guardada se vuelve a cargar al reabrir el diálogo.
        cy.contains('button', /^\s*Configuración\s*$/).click()
        dialog().find('input[name="blockMode"][value="LOW_STOCK"]').should('be.checked')
    })

    it('permite desactivar los avisos y elegir bloquear sin stock', () => {
        const state = newInventoryState()
        visitInventory(state)

        cy.contains('button', /^\s*Configuración\s*$/).click()
        dialog().within(() => {
            cy.get('input[name="alertsEnabled"]').uncheck()
            cy.get('input[name="blockMode"][value="OUT_OF_STOCK"]').check()
            cy.contains('Los pedidos que tú registras nunca se bloquean').should('be.visible')
            cy.contains('button', 'Guardar configuración').click()
        })

        cy.wait('@updateSettings').its('request.body').should('include', {
            alertsEnabled: false,
            blockMode: 'OUT_OF_STOCK',
        })
    })

    it('valida porcentajes y horas', () => {
        visitInventory(newInventoryState())

        cy.contains('button', /^\s*Configuración\s*$/).click()
        dialog().within(() => {
            cy.get('input[name="defaultLowStockPercent"]').clear().type('120')
            cy.get('input[name="consumptionAlertPercent"]').clear().type('0')
            cy.contains('button', 'Guardar configuración').click()
            cy.get('input[name="defaultLowStockPercent"]')
                .closest('div')
                .should('contain', 'Usa un número entero entre 1 y 100.')
            cy.get('input[name="consumptionAlertPercent"]')
                .closest('div')
                .should('contain', 'Usa un número entero entre 1 y 100.')
            // Las horas se eligen de una lista, así que no hay valores inválidos.
            cy.get('select[name="consumptionWindowHours"]').should('exist')
        })
        cy.get('@updateSettings.all').should('have.length', 0)
    })
})

describe('Inventario · navegación', () => {
    it('aparece en la navegación sin badge cuando no hay alertas abiertas', () => {
        visitInventory(newInventoryState())

        cy.contains('nav[aria-label="Navegación principal"] a', 'Inventario')
            .should('have.attr', 'href', '/dashboard/inventory')
        cy.get('[data-testid="inventory-alert-badge"]').should('not.exist')
    })

    it('muestra cuántas alertas hay abiertas en la navegación', () => {
        const state = newInventoryState()
        state.alerts = [
            { id: 'a1', ingredientId: 'ing-pan', ingredientName: 'Pan', unit: 'UNIT', kind: 'STOCK', level: 'OUT', stock: 0, createdAt: '2026-11-19T17:00:00.000Z' },
            { id: 'a2', ingredientId: 'ing-tocino', ingredientName: 'Tocino', unit: 'G', kind: 'STOCK', level: 'CRITICAL', stock: 80, createdAt: '2026-11-19T17:00:00.000Z' },
        ]
        visitInventory(state)

        cy.get('[data-testid="inventory-alert-badge"]').should('contain', '2')
        cy.contains('nav[aria-label="Navegación principal"] a', 'Inventario').should(
            'have.attr',
            'aria-label',
            'Inventario, 2 alertas',
        )
    })
})
