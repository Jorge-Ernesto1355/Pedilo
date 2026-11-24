import type { CyHttpMessages } from 'cypress/types/net-stubbing'

/**
 * API simulada, con estado, del módulo "Grupos de opciones globales" (create-menu).
 *
 * Imita al backend lo suficiente para probar inconsistencias reales: cada mutación sube la
 * versión del grupo y PATCH / PUT products rechazan con 409 un `expectedVersion` viejo. Así
 * un reintento con datos desactualizados falla igual que fallaría contra el servidor.
 *
 * Los grupos no dependen del id del negocio, pero el listado de productos asignables sí
 * (`/businesses/:id/products`). Desde que el layout protegido hidrata el negocio en el
 * servidor, el id lo decide el backend real, por eso esa ruta se intercepta con comodín.
 */

export type GlobalOption = {
    id?: string
    name: string
    price: number
    minSelections: number
    maxSelections: number
    isAvailable: boolean
}

export type GlobalGroup = {
    id: string
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    isActive: boolean
    version: number
    productIds: string[]
    options: GlobalOption[]
}

export type MockProduct = { id: string; name: string; type?: 'SIMPLE' | 'COMBO' }

export type RouteKey =
    'list' | 'detail' | 'create' | 'update' | 'options' | 'assign' | 'archive' | 'products'

export type Reply = {
    statusCode?: number
    body?: unknown
    delay?: number
    forceNetworkError?: boolean
}
/** 'pass' deja que esa llamada la resuelva el comportamiento normal del servidor simulado. */
export type Step = Reply | 'pass'

export type ListShape = 'object' | 'array' | 'nested' | 'null'

export type ApiConfig = {
    groups?: GlobalGroup[]
    products?: MockProduct[]
    /** Forma de la respuesta del listado: el cliente acepta varias. */
    listShape?: ListShape
    /** Dónde viene el total de productos: `total` o `pagination.total`. */
    productsTotalIn?: 'total' | 'pagination'
    /** Cómo normaliza el servidor el nombre al guardarlo (por defecto, tal cual). */
    normalizeName?: (name: string) => string
    /** Retraso por ruta para todas sus llamadas. */
    delays?: Partial<Record<RouteKey, number>>
    /** Retraso del detalle por id de grupo (para provocar carreras entre selecciones). */
    detailDelayById?: Record<string, number>
}

export type Call = { key: RouteKey; method: string; path: string; body: unknown; query: string }

export const FRONT_ERROR = {
    server: 'Ocurrió un problema en el servidor. Inténtalo nuevamente en unos momentos.',
    // Mensaje genérico compartido: lo muestran los errores de red y los 4xx sin código conocido.
    generic: 'No se pudo completar la solicitud.',
    conflict: 'La información cambió o ya existe. Actualiza la página e inténtalo nuevamente.',
    validation: 'Algunos datos no son válidos. Revisa los campos marcados e inténtalo nuevamente.',
    groupNotFound:
        'El grupo ya no está disponible. Actualiza la información e inténtalo nuevamente.',
    nameInUse: 'Ese nombre ya está en uso. Elige otro para continuar.',
} as const

export function makeOption(overrides: Partial<GlobalOption> = {}): GlobalOption {
    return {
        id: 'option-1',
        name: 'Queso extra',
        price: 15,
        minSelections: 0,
        maxSelections: 2,
        isAvailable: true,
        ...overrides,
    }
}

export function makeGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
    return {
        id: 'group-extras',
        name: 'Extras global',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        isActive: true,
        version: 1,
        productIds: [],
        options: [],
        ...overrides,
    }
}

export function makeProducts(count: number, prefix = 'Producto'): MockProduct[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `product-${index + 1}`,
        name: `${prefix} ${index + 1}`,
        type: 'SIMPLE' as const,
    }))
}

type Req = CyHttpMessages.IncomingHttpRequest

const API = '/api/v1/businesses'

function summary(group: GlobalGroup) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { options, productIds, ...rest } = group
    return { ...rest, productsCount: productIds.length }
}

function detail(group: GlobalGroup) {
    return { group: { ...group, productsCount: group.productIds.length } }
}

export function installGlobalGroupsApi(config: ApiConfig = {}) {
    const state = {
        groups: structuredClone(config.groups ?? []),
        products: config.products ?? [],
    }
    const calls: Call[] = []
    const queues: Partial<Record<RouteKey, Step[]>> = {}
    const persistent: Partial<Record<RouteKey, Reply>> = {}
    const delays: Partial<Record<RouteKey, number>> = { ...config.delays }
    let createdCount = 0
    let optionCounter = 0

    const findGroup = (id: string) => state.groups.find((group) => group.id === id)
    const idFrom = (request: Req) => {
        const segments = new URL(request.url).pathname.split('/')
        const index = segments.indexOf('global-option-groups')
        return segments[index + 1] ?? ''
    }
    const notFound = () => ({
        statusCode: 404,
        body: { error: { code: 'OPTION_GROUP_NOT_FOUND', message: 'Group not found' } },
    })
    const versionConflict = () => ({
        statusCode: 409,
        body: { error: { code: 'VERSION_CONFLICT' } },
    })
    const invalid = () => ({
        statusCode: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Invalid body' } },
    })

    function respond(
        request: Req,
        key: RouteKey,
        run: () => { statusCode: number; body: unknown },
        delay = delays[key],
    ) {
        const url = new URL(request.url)
        calls.push({
            key,
            method: request.method,
            path: url.pathname,
            body: request.body,
            query: url.search,
        })
        const step = persistent[key] ?? queues[key]?.shift()
        if (step && step !== 'pass') {
            if (step.forceNetworkError) return request.reply({ forceNetworkError: true })
            if (step.statusCode !== undefined)
                return request.reply({
                    delay: step.delay,
                    statusCode: step.statusCode,
                    body: step.body ?? {},
                })
            return request.reply({ delay: step.delay ?? delay, ...run() })
        }
        return request.reply({ delay, ...run() })
    }

    cy.intercept({ method: 'GET', pathname: `${API}/global-option-groups` }, (request) => {
        request.alias = 'listGroups'
        respond(request, 'list', () => {
            const summaries = state.groups.map(summary)
            const shape = config.listShape ?? 'object'
            const body =
                shape === 'array'
                    ? summaries
                    : shape === 'nested'
                      ? { data: { groups: summaries } }
                      : shape === 'null'
                        ? { groups: null }
                        : { groups: summaries }
            return { statusCode: 200, body }
        })
    })

    cy.intercept({ method: 'POST', pathname: `${API}/global-option-groups` }, (request) => {
        request.alias = 'createGroup'
        respond(request, 'create', () => {
            createdCount += 1
            const body = request.body as Partial<GlobalGroup>
            const created = makeGroup({
                id: `created-group-${createdCount}`,
                name: String(body.name ?? ''),
                isRequired: Boolean(body.isRequired),
                minSelections: body.minSelections ?? 0,
                maxSelections: body.maxSelections ?? 1,
                isActive: body.isActive ?? true,
            })
            state.groups.push(created)
            return { statusCode: 201, body: detail(created) }
        })
    })

    cy.intercept({ method: 'GET', pathname: `${API}/global-option-groups/*` }, (request) => {
        request.alias = 'groupDetail'
        const id = idFrom(request)
        respond(
            request,
            'detail',
            () => {
                const group = findGroup(id)
                return group ? { statusCode: 200, body: detail(group) } : notFound()
            },
            config.detailDelayById?.[id] ?? delays.detail,
        )
    })

    cy.intercept({ method: 'PATCH', pathname: `${API}/global-option-groups/*` }, (request) => {
        request.alias = 'updateGroup'
        respond(request, 'update', () => {
            const group = findGroup(idFrom(request))
            if (!group) return notFound()
            const body = request.body as Partial<GlobalGroup> & { expectedVersion?: number }
            if (body.expectedVersion !== undefined && body.expectedVersion !== group.version)
                return versionConflict()
            if (typeof body.name === 'string' && !body.name.trim()) return invalid()
            if (typeof body.name === 'string')
                group.name = config.normalizeName?.(body.name) ?? body.name
            if (typeof body.isRequired === 'boolean') group.isRequired = body.isRequired
            if (typeof body.minSelections === 'number') group.minSelections = body.minSelections
            if (typeof body.maxSelections === 'number') group.maxSelections = body.maxSelections
            if (typeof body.isActive === 'boolean') group.isActive = body.isActive
            group.version += 1
            return { statusCode: 200, body: detail(group) }
        })
    })

    cy.intercept({ method: 'DELETE', pathname: `${API}/global-option-groups/*` }, (request) => {
        request.alias = 'archiveGroup'
        respond(request, 'archive', () => {
            const id = idFrom(request)
            if (!findGroup(id)) return notFound()
            state.groups = state.groups.filter((group) => group.id !== id)
            return { statusCode: 200, body: {} }
        })
    })

    cy.intercept(
        { method: 'PUT', pathname: `${API}/global-option-groups/*/options` },
        (request) => {
            request.alias = 'replaceOptions'
            respond(request, 'options', () => {
                const group = findGroup(idFrom(request))
                if (!group) return notFound()
                const options = (request.body as { options?: GlobalOption[] }).options ?? []
                if (options.length > 10 || options.some((option) => !option.name.trim()))
                    return invalid()
                group.options = options.map((option) => ({
                    ...option,
                    id: option.id ?? `option-created-${(optionCounter += 1)}`,
                }))
                group.version += 1
                return { statusCode: 200, body: detail(group) }
            })
        },
    )

    cy.intercept(
        { method: 'PUT', pathname: `${API}/global-option-groups/*/products` },
        (request) => {
            request.alias = 'assignProducts'
            respond(request, 'assign', () => {
                const group = findGroup(idFrom(request))
                if (!group) return notFound()
                const body = request.body as { productIds?: string[]; expectedVersion?: number }
                if (body.expectedVersion !== undefined && body.expectedVersion !== group.version)
                    return versionConflict()
                group.productIds = body.productIds ?? []
                group.version += 1
                return { statusCode: 200, body: detail(group) }
            })
        },
    )

    cy.intercept({ method: 'GET', pathname: `${API}/*/products` }, (request) => {
        const url = new URL(request.url)
        // Otros paneles de la pantalla piden productos con orden y límite propios: no se tocan.
        if (url.searchParams.has('sortBy')) return
        request.alias = 'productsPage'
        respond(request, 'products', () => {
            const page = Number(url.searchParams.get('page') ?? 1)
            const limit = Number(url.searchParams.get('limit') ?? 10)
            const slice = state.products.slice((page - 1) * limit, page * limit)
            const total = state.products.length
            return {
                statusCode: 200,
                body:
                    config.productsTotalIn === 'pagination'
                        ? { products: slice, pagination: { page, limit, total } }
                        : { products: slice, page, limit, total },
            }
        })
    })

    return {
        state,
        calls,
        /** Programa las próximas respuestas de una ruta (se consumen en orden). */
        script(route: RouteKey, ...steps: Step[]) {
            queues[route] = steps
        },
        /**
         * Hace fallar TODAS las llamadas de la ruta hasta `clear`. Hace falta para los cortes de
         * red en GET: Chrome reintenta una vez las peticiones idempotentes que se cortan.
         */
        failAlways(route: RouteKey, reply: Reply) {
            persistent[route] = reply
        },
        clear(route: RouteKey) {
            delete persistent[route]
            delete queues[route]
        },
        setDelay(route: RouteKey, ms: number | undefined) {
            delays[route] = ms
        },
        callsOf(key: RouteKey) {
            return calls.filter((call) => call.key === key)
        },
        group(id: string) {
            return findGroup(id)
        },
    }
}

export type GlobalGroupsApi = ReturnType<typeof installGlobalGroupsApi>
