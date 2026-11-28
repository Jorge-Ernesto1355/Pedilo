/**
 * Stateful fake of the inventory API for Cypress. It mirrors the backend rules
 * that the screens rely on (levels, counts, ordering, duplicate names, movement
 * math) so the specs exercise the real UI against predictable data.
 */

export type FakeIngredient = {
    id: string
    name: string
    unit: 'G' | 'ML' | 'UNIT'
    stock: number
    parLevel: number
    lowStockMode: 'PERCENT' | 'ABSOLUTE'
    lowStockValue: number | null
    consumptionAlertPercent: number | null
    createdAt: string
    updatedAt: string
}

export type FakeMovement = {
    id: string
    ingredientId: string
    type: 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT'
    quantity: number
    stockAfter: number
    orderId: string | null
    note: string | null
    createdAt: string
}

export type FakeAlert = {
    id: string
    ingredientId: string
    ingredientName: string
    unit: 'G' | 'ML' | 'UNIT'
    kind: 'STOCK' | 'CONSUMPTION'
    level: 'LOW' | 'CRITICAL' | 'OUT' | 'HIGH'
    stock: number
    createdAt: string
}

export type FakeSettings = {
    alertsEnabled: boolean
    defaultLowStockPercent: number
    consumptionAlertPercent: number
    consumptionWindowHours: number
    blockMode: 'NONE' | 'OUT_OF_STOCK' | 'LOW_STOCK'
}

export type InventoryApiState = {
    ingredients: FakeIngredient[]
    movements: FakeMovement[]
    recipes: Record<string, { ingredientId: string; quantity: number }[]>
    settings: FakeSettings
    alerts: FakeAlert[]
    failList: boolean
    nextId: number
    /** Last bodies received, for payload assertions. */
    lastCreate?: Record<string, unknown>
    lastUpdate?: Record<string, unknown>
    lastMovement?: Record<string, unknown>
    lastRecipe?: { key: string; body: unknown }
    lastSettings?: Record<string, unknown>
}

const stamp = '2026-11-01T12:00:00.000Z'

export function ingredient(overrides: Partial<FakeIngredient> & { id: string; name: string }): FakeIngredient {
    return {
        unit: 'G',
        stock: 1000,
        parLevel: 1000,
        lowStockMode: 'PERCENT',
        lowStockValue: null,
        consumptionAlertPercent: null,
        createdAt: stamp,
        updatedAt: stamp,
        ...overrides,
    }
}

/** One ingredient per level, with the default 20% threshold of a 1 kg par level. */
export function seededIngredients(): FakeIngredient[] {
    return [
        ingredient({ id: 'ing-queso', name: 'Queso', stock: 900 }),
        ingredient({ id: 'ing-carne', name: 'Carne', stock: 150 }),
        ingredient({ id: 'ing-tocino', name: 'Tocino', stock: 80 }),
        ingredient({ id: 'ing-pan', name: 'Pan', unit: 'UNIT', stock: 0, parLevel: 50 }),
    ]
}

export function newInventoryState(overrides: Partial<InventoryApiState> = {}): InventoryApiState {
    return {
        ingredients: seededIngredients(),
        movements: [],
        recipes: {},
        settings: {
            alertsEnabled: true,
            defaultLowStockPercent: 20,
            consumptionAlertPercent: 20,
            consumptionWindowHours: 24,
            blockMode: 'NONE',
        },
        alerts: [],
        failList: false,
        nextId: 1,
        ...overrides,
    }
}

type Level = 'OK' | 'LOW' | 'CRITICAL' | 'OUT'

function viewOf(item: FakeIngredient, settings: FakeSettings) {
    const threshold =
        item.lowStockMode === 'ABSOLUTE'
            ? Math.max(0, item.lowStockValue ?? 0)
            : (item.parLevel * (item.lowStockValue ?? settings.defaultLowStockPercent)) / 100
    const level: Level =
        item.stock <= 0
            ? 'OUT'
            : threshold <= 0
              ? 'OK'
              : item.stock <= threshold / 2
                ? 'CRITICAL'
                : item.stock <= threshold
                  ? 'LOW'
                  : 'OK'
    return { ...item, threshold, level }
}

const urgency: Record<Level, number> = { OUT: 0, CRITICAL: 1, LOW: 2, OK: 3 }

export function installInventoryApi(state: InventoryApiState) {
    const base = '**/api/v1/businesses/*/inventory'

    cy.intercept('GET', `${base}/ingredients*`, (request) => {
        if (state.failList) {
            request.reply({ statusCode: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'boom' } } })
            return
        }
        const params = new URL(request.url).searchParams
        const search = (params.get('search') ?? '').toLowerCase()
        const status = params.get('status')
        const views = state.ingredients.map((item) => viewOf(item, state.settings))
        const counts = { OK: 0, LOW: 0, CRITICAL: 0, OUT: 0 }
        views.forEach((view) => (counts[view.level] += 1))
        const filtered = views
            .filter((view) => !search || view.name.toLowerCase().includes(search))
            .filter((view) =>
                !status ? true : status === 'ALERTS' ? view.level !== 'OK' : view.level === status,
            )
            .sort((a, b) => urgency[a.level] - urgency[b.level] || a.name.localeCompare(b.name))
        request.reply({ statusCode: 200, body: { ingredients: filtered, counts } })
    }).as('listIngredients')

    cy.intercept('POST', `${base}/ingredients`, (request) => {
        state.lastCreate = request.body
        const name = String(request.body.name).trim()
        if (state.ingredients.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
            request.reply({
                statusCode: 409,
                body: { error: { code: 'INGREDIENT_ALREADY_EXISTS', message: 'An ingredient with this name already exists' } },
            })
            return
        }
        const created = ingredient({
            id: `ing-created-${state.nextId++}`,
            name,
            unit: request.body.unit,
            stock: request.body.initialStock ?? 0,
            parLevel: Math.max(request.body.parLevel ?? 0, request.body.initialStock ?? 0),
            lowStockMode: request.body.lowStockMode ?? 'PERCENT',
            lowStockValue: request.body.lowStockValue ?? null,
            consumptionAlertPercent: request.body.consumptionAlertPercent ?? null,
        })
        state.ingredients.push(created)
        request.reply({ statusCode: 201, body: { ingredient: viewOf(created, state.settings) } })
    }).as('createIngredient')

    cy.intercept('PATCH', `${base}/ingredients/*`, (request) => {
        state.lastUpdate = request.body
        const id = request.url.split('/').pop()
        const item = state.ingredients.find((candidate) => candidate.id === id)
        if (!item) return request.reply({ statusCode: 404, body: { error: { code: 'INGREDIENT_NOT_FOUND', message: 'not found' } } })
        Object.assign(item, request.body)
        request.reply({ statusCode: 200, body: { ingredient: viewOf(item, state.settings) } })
    }).as('updateIngredient')

    cy.intercept('DELETE', `${base}/ingredients/*`, (request) => {
        const id = request.url.split('/').pop()
        state.ingredients = state.ingredients.filter((item) => item.id !== id)
        request.reply({ statusCode: 204 })
    }).as('archiveIngredient')

    cy.intercept('POST', `${base}/ingredients/*/movements`, (request) => {
        state.lastMovement = request.body
        const id = request.url.split('/').at(-2)
        const item = state.ingredients.find((candidate) => candidate.id === id)
        if (!item) return request.reply({ statusCode: 404, body: { error: { code: 'INGREDIENT_NOT_FOUND', message: 'not found' } } })
        const { type, quantity, note } = request.body as { type: FakeMovement['type']; quantity: number; note: string | null }
        const delta = type === 'PURCHASE' ? quantity : type === 'WASTE' ? -quantity : quantity - item.stock
        item.stock = Math.round((item.stock + delta) * 1000) / 1000
        if (type === 'PURCHASE' && item.stock > item.parLevel) item.parLevel = item.stock
        const movement: FakeMovement = {
            id: `mov-${state.nextId++}`,
            ingredientId: item.id,
            type,
            quantity: delta,
            stockAfter: item.stock,
            orderId: null,
            note: note ?? null,
            createdAt: '2026-11-19T18:00:00.000Z',
        }
        state.movements.unshift(movement)
        request.reply({ statusCode: 201, body: { ingredient: viewOf(item, state.settings), movement } })
    }).as('recordMovement')

    cy.intercept('GET', `${base}/ingredients/*/movements*`, (request) => {
        const id = request.url.split('/').at(-2)
        const rows = state.movements.filter((movement) => movement.ingredientId === id)
        request.reply({ statusCode: 200, body: { movements: rows, total: rows.length, page: 1, limit: 20 } })
    }).as('listMovements')

    const recipeLines = (key: string) =>
        (state.recipes[key] ?? []).map((line) => {
            const item = state.ingredients.find((candidate) => candidate.id === line.ingredientId)
            return {
                ingredientId: line.ingredientId,
                ingredientName: item?.name ?? '',
                unit: item?.unit ?? 'G',
                quantity: line.quantity,
            }
        })

    cy.intercept('GET', `${base}/recipes/*/*`, (request) => {
        const [kind, id] = request.url.split('?')[0].split('/').slice(-2)
        request.reply({ statusCode: 200, body: { lines: recipeLines(`${kind}/${id}`) } })
    }).as('getRecipe')

    cy.intercept('PUT', `${base}/recipes/*/*`, (request) => {
        const [kind, id] = request.url.split('/').slice(-2)
        const key = `${kind}/${id}`
        state.lastRecipe = { key, body: request.body }
        state.recipes[key] = request.body.lines
        request.reply({ statusCode: 200, body: { lines: recipeLines(key) } })
    }).as('setRecipe')

    cy.intercept('GET', `${base}/settings`, (request) => {
        request.reply({ statusCode: 200, body: { settings: state.settings } })
    }).as('getSettings')

    cy.intercept('PATCH', `${base}/settings`, (request) => {
        state.lastSettings = request.body
        state.settings = { ...state.settings, ...request.body }
        request.reply({ statusCode: 200, body: { settings: state.settings } })
    }).as('updateSettings')

    cy.intercept('GET', `${base}/alerts`, (request) => {
        request.reply({ statusCode: 200, body: { alerts: state.alerts } })
    })
}

/** Logs in with the seeded owner (npm run e2e:seed) and returns once the session exists. */
export function loginAsSeedOwner() {
    cy.env(['e2eSeedEmail', 'e2eSeedPassword']).then(({ e2eSeedEmail, e2eSeedPassword }) => {
        if (!e2eSeedEmail || !e2eSeedPassword)
            throw new Error('Configura E2E_SEED_EMAIL y E2E_SEED_PASSWORD o ejecuta npm run e2e:seed.')
        cy.loginWithApi({ email: e2eSeedEmail, password: e2eSeedPassword })
    }).as('listAlerts')
}

/** Business id of the logged-in owner, read from the backend with the session cookie. */
export function currentBusinessId() {
    return cy.env(['backendUrl']).then(({ backendUrl }) =>
        cy
            .request<{ business?: { id: string }; id?: string }>(`${String(backendUrl).replace(/\/$/, '')}/api/v1/businesses/mine`)
            .then((response) => {
                const id = response.body.business?.id ?? response.body.id
                expect(id, 'business id').to.be.a('string')
                return id as string
            }),
    )
}

export type StockAlertFrame = {
    alertId: string
    ingredientId?: string
    ingredientName: string
    unit?: 'G' | 'ML' | 'UNIT'
    kind?: 'STOCK' | 'CONSUMPTION'
    level: 'LOW' | 'CRITICAL' | 'OUT' | 'HIGH'
    stock: number
    threshold?: number
    restaurantId: string
}

export function stockAlertFrame(alert: StockAlertFrame, eventId = `event-${alert.alertId}-${alert.level}`) {
    const payload = {
        eventId,
        type: 'stock_alert',
        ingredientId: 'ing-queso',
        unit: 'G',
        kind: 'STOCK',
        threshold: 200,
        createdAt: '2026-11-19T18:00:00.000Z',
        ...alert,
    }
    return `id: ${eventId}\nevent: stock_alert\ndata: ${JSON.stringify(payload)}\n\n`
}

/**
 * Serves the order stream. Frames queued in `state.frames` are delivered on the
 * next (re)connection, which is how the client receives them in a test.
 */
export function installEventStream(state: { frames: string[]; connections: number }) {
    cy.intercept('GET', '**/api/orders/events', (request) => {
        state.connections += 1
        const body = state.frames.length ? state.frames.splice(0).join('') : ': connected\n\n'
        request.reply({
            statusCode: 200,
            headers: {
                'content-type': 'text/event-stream; charset=utf-8',
                'cache-control': 'no-cache, no-transform',
            },
            body,
        })
    }).as('eventStream')
}
