// Utilidades exclusivas de las pruebas de envío a domicilio (no es un spec).
//
// Las pruebas usan una cuenta y un negocio propios para no alterar los datos de otras
// suites. `seedDelivery` los crea si no existen y deja la configuración de envío en su
// estado base; es idempotente. Solo se ejecuta contra un backend local, o contra el de
// desarrollo con CYPRESS_ALLOW_REMOTE_SEED=true (ver cypress/support/seedGuard.ts).
//
// Las tarifas de aquí son SOLO datos de prueba; Pedilo no trae tarifas precargadas.

import { assertSeedAllowed } from '../../support/seedGuard'

export type Coordinates = { latitude: number; longitude: number }

export type DeliverySeed = {
    businessId: string
    slug: string
    email: string
    origin: Coordinates
    settings: typeof DELIVERY_SEED_SETTINGS
}

const DELIVERY_EMAIL = 'cypress-delivery-seed@pedilo.test'
export const DELIVERY_PASSWORD = 'Strong-pass-123'
const DELIVERY_SLUG = 'e2e-delivery-restaurante'

/** Centro de Mazatlán. Las pruebas calculan destinos a distancias exactas desde aquí. */
export const DELIVERY_SEED_ORIGIN: Coordinates = { latitude: 23.2494, longitude: -106.4111 }

/** Hasta 2 km → $30, hasta 5 km → $50; radio máximo 5 km. */
export const DELIVERY_SEED_SETTINGS = {
    enabled: true,
    maxDeliveryKm: 5,
    feeConfig: {
        type: 'DISTANCE_TIERS' as const,
        tiers: [
            { upToKm: 2, fee: 30 },
            { upToKm: 5, fee: 50 },
        ],
    },
}

export function backendApi(path: string): Cypress.Chainable<string> {
    return cy
        .env(['backendUrl'])
        .then(({ backendUrl }) => `${String(backendUrl).replace(/\/$/, '')}/api/v1${path}`)
}

function unwrapBusiness(body: unknown): { id: string; slug?: string } | null {
    const value = body as { business?: unknown; data?: { business?: unknown } } | null
    const business = value?.business ?? value?.data?.business
    return business && typeof business === 'object'
        ? (business as { id: string; slug?: string })
        : null
}

function ensureAccount(api: string) {
    const credentials = { email: DELIVERY_EMAIL, password: DELIVERY_PASSWORD }
    cy.request({
        method: 'POST',
        url: `${api}/auth/login`,
        body: credentials,
        failOnStatusCode: false,
    }).then((login) => {
        if (login.status === 200 || login.status === 201) return
        expect(login.status, 'login de la cuenta E2E de envíos').to.eq(401)
        cy.request('POST', `${api}/auth/register`, {
            name: 'E2E Envíos',
            ...credentials,
            acceptLegalDocuments: true,
            ageDeclaration: true,
        })
        cy.request('POST', `${api}/auth/login`, credentials)
    })
}

function ensureBusiness(api: string): Cypress.Chainable<string> {
    return cy.request({ url: `${api}/businesses/mine`, failOnStatusCode: false }).then((mine) => {
        const existing = mine.status === 200 ? unwrapBusiness(mine.body) : null
        if (existing) {
            expect(existing.slug, 'negocio de la cuenta E2E de envíos').to.eq(DELIVERY_SLUG)
            return cy.wrap(existing.id)
        }
        return cy
            .request('POST', `${api}/businesses`, {
                name: 'E2E Restaurante Envíos',
                slug: DELIVERY_SLUG,
                description: 'Escenario persistente para pruebas E2E de envío a domicilio.',
                ubication: 'Centro, Mazatlán',
                businessSchedule: {
                    days: [
                        'monday',
                        'tuesday',
                        'wednesday',
                        'thursday',
                        'friday',
                        'saturday',
                        'sunday',
                    ].map((key) => ({ key, label: key.slice(0, 3), enabled: true })),
                    openTime: '00:00',
                    closeTime: '23:59',
                },
            })
            .then((created) => {
                const business = unwrapBusiness(created.body)
                expect(business, 'negocio creado').to.not.equal(null)
                return cy.wrap(business!.id)
            })
    })
}

/** Crea/restablece la cuenta, el negocio y la configuración de envío de las pruebas. */
export function seedDelivery(): Cypress.Chainable<DeliverySeed> {
    return backendApi('').then((api) => {
        assertSeedAllowed(api, 'envío')
        ensureAccount(api)
        return ensureBusiness(api).then((businessId) => {
            ensureWhatsapp(api)
            ensureCatalog(api, businessId)
            ensurePaymentCard(api)
            return cy
                .request('PUT', `${api}/businesses/delivery-settings`, {
                    ...DELIVERY_SEED_SETTINGS,
                    origin: DELIVERY_SEED_ORIGIN,
                })
                .then((): DeliverySeed => ({
                    businessId,
                    slug: DELIVERY_SLUG,
                    email: DELIVERY_EMAIL,
                    origin: DELIVERY_SEED_ORIGIN,
                    settings: DELIVERY_SEED_SETTINGS,
                }))
        })
    })
}

/** Producto único del escenario: sin opciones, $100. */
export const DELIVERY_SEED_PRODUCT = { name: 'E2E Envío Tacos', price: 100 }
const DELIVERY_SEED_MENU = 'E2E Envíos'
const DELIVERY_SEED_CATEGORY = 'E2E Comida a domicilio'
/** Mismo número de prueba que usa scripts/seed-e2e.mjs. */
const DELIVERY_SEED_WHATSAPP = '6981119319'
/** CLABE de prueba válida (misma que usa payment-card-settings.cy.ts). */
const DELIVERY_SEED_CARD = {
    clabe: '012000000000000001',
    beneficiaryName: 'Beneficiario E2E Envíos',
}

type Named = { id: string; name: string; categories?: Named[]; isAvailable?: boolean }

function unwrap(body: unknown, key?: string): unknown {
    const value = body as Record<string, unknown> | null
    if (value && typeof value === 'object' && value.data !== undefined)
        return unwrap(value.data, key)
    if (key && value && typeof value === 'object' && value[key] !== undefined) return value[key]
    return body
}

function list(body: unknown, key: string): Named[] {
    const value = unwrap(body)
    if (Array.isArray(value)) return value as Named[]
    const nested = unwrap(value, key)
    return Array.isArray(nested) ? (nested as Named[]) : []
}

function ensureWhatsapp(api: string) {
    cy.request(`${api}/businesses/settings`).then((response) => {
        const settings = unwrap(response.body) as { whatsapp?: string | null } | null
        if (settings?.whatsapp !== DELIVERY_SEED_WHATSAPP) {
            cy.request('PATCH', `${api}/businesses/settings`, { whatsapp: DELIVERY_SEED_WHATSAPP })
        }
    })
}

function ensureCatalog(api: string, businessId: string) {
    cy.request(`${api}/businesses/mine/menus`)
        .then((response) => {
            const menu = list(response.body, 'menus').find(
                (item) => item.name === DELIVERY_SEED_MENU,
            )
            if (menu) return cy.wrap(menu)
            return cy
                .request('POST', `${api}/businesses/${businessId}/menus`, {
                    name: DELIVERY_SEED_MENU,
                    description: 'Menú del escenario E2E de envío a domicilio.',
                    isActive: true,
                    categories: [{ name: DELIVERY_SEED_CATEGORY, description: 'Categoría E2E.' }],
                })
                .then((created) => unwrap(created.body, 'menu') as Named)
        })
        .then((menu) => {
            const category = menu.categories?.find((item) => item.name === DELIVERY_SEED_CATEGORY)
            if (category) return cy.wrap(category)
            return cy
                .request('POST', `${api}/businesses/${businessId}/categories`, {
                    menuId: menu.id,
                    name: DELIVERY_SEED_CATEGORY,
                    description: 'Categoría E2E.',
                })
                .then((created) => unwrap(created.body, 'category') as Named)
        })
        .then((category) =>
            cy.request(`${api}/businesses/categories/${category.id}/products`).then((response) => {
                const product = list(response.body, 'products').find(
                    (item) => item.name === DELIVERY_SEED_PRODUCT.name,
                )
                if (!product) {
                    cy.request('POST', `${api}/businesses/${businessId}/products`, {
                        categoryId: category.id,
                        name: DELIVERY_SEED_PRODUCT.name,
                        description: 'Producto del escenario E2E de envío a domicilio.',
                        price: DELIVERY_SEED_PRODUCT.price,
                        active: true,
                    })
                } else if (product.isAvailable === false) {
                    cy.request('PATCH', `${api}/businesses/products/${product.id}/status`, {
                        isAvailable: true,
                    })
                }
            }),
        )
}

function ensurePaymentCard(api: string) {
    cy.request('PUT', `${api}/businesses/payment-card`, DELIVERY_SEED_CARD)
    cy.request('PATCH', `${api}/businesses/payment-card/status`, { isActive: true })
}

export function loginAsDeliveryOwner(seed: DeliverySeed) {
    cy.login({ email: seed.email, password: DELIVERY_PASSWORD })
}

/** Mismos valores que el backend (src/modules/delivery/domain/distance.ts). */
const ROUTE_FACTOR = 1.3
const EARTH_RADIUS_KM = 6371.0088

/** Punto al norte de `origin` cuya distancia de envío (línea recta × 1.3) es `roadKm`. */
export function pointAtRoadKm(origin: Coordinates, roadKm: number): Coordinates {
    const straightKm = roadKm / ROUTE_FACTOR
    return {
        latitude: origin.latitude + ((straightKm / EARTH_RADIUS_KM) * 180) / Math.PI,
        longitude: origin.longitude,
    }
}

/** Evita depender de servicios externos de mapas durante las pruebas. */
export function stubMapServices() {
    cy.intercept('GET', 'https://*.tile.openstreetmap.org/**', { statusCode: 204 })
    cy.intercept('GET', 'https://nominatim.openstreetmap.org/**', { statusCode: 200, body: [] })
    cy.intercept('GET', '**/api/geocoding/search**', { statusCode: 200, body: [] })
}

export function revealDeliverySettings() {
    cy.get('[data-cy="delivery-settings"]').first().scrollIntoView({ duration: 0 })
}
