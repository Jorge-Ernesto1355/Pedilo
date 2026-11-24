// Utilidades exclusivas de las pruebas de la tarjeta de lealtad (no es un spec).
//
// Semillas: cuentas y negocios propios para no alterar otras suites.
//  - A "e2e-loyalty-a": programa ACTIVO (se restablece a valores conocidos en cada prueba).
//  - B "e2e-loyalty-b": SIN programa (nunca se le crea uno).
//  - C "e2e-loyalty-c": otro restaurante CON programa, para pruebas de acceso cruzado.
// Cada prueba crea sus propios clientes (teléfono único), así los datos quedan aislados.
// `customerWithStamps(n)` deja a un cliente con 0, 7 u 8 sellos (8 = tarjeta completa con
// premio disponible). Solo corre contra un backend local.

export type LoyaltyBusiness = {
    key: 'a' | 'b' | 'c'
    email: string
    slug: string
    name: string
    businessId: string
    productId: string
    giftProductId: string
}

export type LoyaltySeed = { a: LoyaltyBusiness; b: LoyaltyBusiness; c: LoyaltyBusiness }

export const LOYALTY_PASSWORD = 'Strong-pass-123'
export const PRODUCT_PRICE = 100
export const GIFT_PRICE = 25

const ACCOUNTS = {
    a: {
        email: 'cypress-loyalty-a@pedilo.test',
        slug: 'e2e-loyalty-a',
        name: 'E2E Lealtad Café',
    },
    b: {
        email: 'cypress-loyalty-b@pedilo.test',
        slug: 'e2e-loyalty-b',
        name: 'E2E Lealtad Sin Programa',
    },
    c: {
        email: 'cypress-loyalty-c@pedilo.test',
        slug: 'e2e-loyalty-c',
        name: 'E2E Lealtad Vecino',
    },
} as const

type AccountKey = keyof typeof ACCOUNTS

const MENU = 'E2E Lealtad Menú'
const CATEGORY = 'E2E Lealtad Categoría'
const PRODUCT = { name: 'E2E Lealtad Tacos', price: PRODUCT_PRICE }
const GIFT = { name: 'E2E Lealtad Agua', price: GIFT_PRICE }
/** Mismo número de prueba que usan scripts/seed-e2e.mjs y las pruebas de envíos. */
const SEED_WHATSAPP = '6981119319'
const SEED_CARD = { clabe: '012000000000000001', beneficiaryName: 'Beneficiario E2E Lealtad' }

/** Plantilla "clásica" (misma que el backend y el editor). */
export function defaultDesign(title: string = ACCOUNTS.a.name) {
    return {
        template: 'clasica',
        background: {
            type: 'solid',
            color1: '#F8F4EC',
            color2: '#EFE6D4',
            angle: 135,
            pattern: 'none',
            patternOpacity: 0.12,
        },
        text: {
            primaryColor: '#10224A',
            secondaryColor: '#4A5878',
            font: 'serif',
            title,
            subtitle: 'Tarjeta de lealtad',
            showLogo: true,
        },
        stamp: {
            shape: 'circle',
            icon: 'check',
            size: 'md',
            filledColor: '#1E40AF',
            iconColor: '#FFFFFF',
            emptyColor: '#8A97B1',
            emptyStyle: 'dashed',
        },
        layout: { columns: 'auto', rewardSlot: 'icon' },
        card: { radius: 'lg', border: true, borderColor: '#E3DCCB', shadow: 'soft' },
        animation: { stampEffect: 'press', completionEffect: 'glow', speed: 'normal' },
    }
}

/** Programa base de las pruebas: 8 sellos, manual, 20%, sin caducidad. */
export function programBody(overrides: Record<string, unknown> = {}) {
    return {
        enabled: true,
        stampsRequired: 8,
        stampMode: 'MANUAL',
        minOrderAmount: 0,
        rewardType: 'PERCENT',
        rewardValue: 20,
        rewardProductId: null,
        rewardLabel: '20% de descuento',
        rewardExpiresDays: null,
        // Holgado para poder sembrar clientes con 7 u 8 sellos; las pruebas del tope lo bajan.
        walkInDailyLimit: 20,
        design: defaultDesign(),
        ...overrides,
    }
}

export function backendApi(path: string): Cypress.Chainable<string> {
    return cy
        .env(['backendUrl'])
        .then(({ backendUrl }) => `${String(backendUrl).replace(/\/$/, '')}/api/v1${path}`)
}

function unwrap(body: unknown, key?: string): unknown {
    const value = body as Record<string, unknown> | null
    if (value && typeof value === 'object' && value.data !== undefined)
        return unwrap(value.data, key)
    if (key && value && typeof value === 'object' && value[key] !== undefined) return value[key]
    return body
}

type Named = { id: string; name: string; categories?: Named[]; isAvailable?: boolean }

function list(body: unknown, key: string): Named[] {
    const value = unwrap(body)
    if (Array.isArray(value)) return value as Named[]
    const nested = unwrap(value, key)
    return Array.isArray(nested) ? (nested as Named[]) : []
}

function login(api: string, email: string) {
    return cy.request('POST', `${api}/auth/login`, { email, password: LOYALTY_PASSWORD })
}

function ensureAccount(api: string, account: (typeof ACCOUNTS)[AccountKey]) {
    cy.request({
        method: 'POST',
        url: `${api}/auth/login`,
        body: { email: account.email, password: LOYALTY_PASSWORD },
        failOnStatusCode: false,
    }).then((response) => {
        if (response.status === 200 || response.status === 201) return
        expect(response.status, `login de ${account.email}`).to.eq(401)
        cy.request('POST', `${api}/auth/register`, {
            name: account.name,
            email: account.email,
            password: LOYALTY_PASSWORD,
            acceptLegalDocuments: true,
            ageDeclaration: true,
        })
        login(api, account.email)
    })
}

function ensureBusiness(
    api: string,
    account: (typeof ACCOUNTS)[AccountKey],
): Cypress.Chainable<string> {
    return cy.request({ url: `${api}/businesses/mine`, failOnStatusCode: false }).then((mine) => {
        const existing =
            mine.status === 200
                ? (unwrap(mine.body, 'business') as Named & { slug?: string })
                : null
        if (existing?.id) {
            expect(existing.slug, `negocio de ${account.email}`).to.eq(account.slug)
            return cy.wrap(existing.id)
        }
        return cy
            .request('POST', `${api}/businesses`, {
                name: account.name,
                slug: account.slug,
                description: 'Escenario persistente para pruebas E2E de la tarjeta de lealtad.',
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
            .then((created) => (unwrap(created.body, 'business') as Named).id)
    })
}

function ensureProduct(
    api: string,
    businessId: string,
    categoryId: string,
    products: Named[],
    wanted: { name: string; price: number },
): Cypress.Chainable<string> {
    const product = products.find((item) => item.name === wanted.name)
    if (product) {
        if (product.isAvailable === false) {
            cy.request('PATCH', `${api}/businesses/products/${product.id}/status`, {
                isAvailable: true,
            })
        }
        return cy.wrap(product.id)
    }
    return cy
        .request('POST', `${api}/businesses/${businessId}/products`, {
            categoryId,
            name: wanted.name,
            description: 'Producto del escenario E2E de lealtad.',
            price: wanted.price,
            active: true,
        })
        .then((created) => (unwrap(created.body, 'product') as Named).id)
}

function ensureCatalog(
    api: string,
    businessId: string,
): Cypress.Chainable<{ productId: string; giftProductId: string }> {
    return cy
        .request(`${api}/businesses/mine/menus`)
        .then((response) => {
            const menu = list(response.body, 'menus').find((item) => item.name === MENU)
            if (menu) return cy.wrap(menu)
            return cy
                .request('POST', `${api}/businesses/${businessId}/menus`, {
                    name: MENU,
                    description: 'Menú del escenario E2E de lealtad.',
                    isActive: true,
                    categories: [{ name: CATEGORY, description: 'Categoría E2E.' }],
                })
                .then((created) => unwrap(created.body, 'menu') as Named)
        })
        .then((menu) => {
            const category = menu.categories?.find((item) => item.name === CATEGORY)
            if (category) return cy.wrap(category)
            return cy
                .request('POST', `${api}/businesses/${businessId}/categories`, {
                    menuId: menu.id,
                    name: CATEGORY,
                    description: 'Categoría E2E.',
                })
                .then((created) => unwrap(created.body, 'category') as Named)
        })
        .then((category) =>
            cy.request(`${api}/businesses/categories/${category.id}/products`).then((response) => {
                const products = list(response.body, 'products')
                return ensureProduct(api, businessId, category.id, products, PRODUCT).then(
                    (productId) =>
                        ensureProduct(api, businessId, category.id, products, GIFT).then(
                            (giftProductId) => ({
                                productId,
                                giftProductId,
                            }),
                        ),
                )
            }),
        )
}

function ensureSettings(api: string) {
    cy.request(`${api}/businesses/settings`).then((response) => {
        const settings = unwrap(response.body) as { whatsapp?: string | null } | null
        if (settings?.whatsapp !== SEED_WHATSAPP) {
            cy.request('PATCH', `${api}/businesses/settings`, { whatsapp: SEED_WHATSAPP })
        }
    })
    cy.request('PUT', `${api}/businesses/payment-card`, SEED_CARD)
    cy.request('PATCH', `${api}/businesses/payment-card/status`, { isActive: true })
}

function seedBusiness(api: string, key: AccountKey): Cypress.Chainable<LoyaltyBusiness> {
    const account = ACCOUNTS[key]
    ensureAccount(api, account)
    return ensureBusiness(api, account).then((businessId) => {
        ensureSettings(api)
        return ensureCatalog(api, businessId).then(
            ({ productId, giftProductId }): LoyaltyBusiness => ({
                key,
                email: account.email,
                slug: account.slug,
                name: account.name,
                businessId,
                productId,
                giftProductId,
            }),
        )
    })
}

/**
 * Crea/restablece los negocios. A y C quedan con el programa base activo; B sin programa.
 * Idempotente. Al terminar, la sesión activa es la del dueño de A.
 */
export function seedLoyalty(
    programOverrides: Record<string, unknown> = {},
): Cypress.Chainable<LoyaltySeed> {
    return backendApi('').then((api) => {
        expect(
            ['localhost', '127.0.0.1'],
            'las pruebas de lealtad solo corren contra un backend local',
        ).to.include(new URL(api).hostname)
        return seedBusiness(api, 'b').then((b) =>
            seedBusiness(api, 'c').then((c) => {
                cy.request(
                    'PUT',
                    `${api}/businesses/loyalty/program`,
                    programBody({ design: defaultDesign(c.name) }),
                )
                return seedBusiness(api, 'a').then((a) =>
                    cy
                        .request(
                            'PUT',
                            `${api}/businesses/loyalty/program`,
                            programBody(programOverrides),
                        )
                        .then(() => ({ a, b, c })),
                )
            }),
        )
    })
}

/** Cambia la sesión del navegador de Cypress al dueño indicado (por API). */
export function asOwner(business: LoyaltyBusiness) {
    return backendApi('').then((api) => login(api, business.email))
}

/** Petición del dueño con la sesión actual; no falla por estado HTTP. */
export function owner(method: string, path: string, body?: Cypress.RequestBody) {
    return backendApi(path).then((url) =>
        cy.request({ method, url, body, failOnStatusCode: false }),
    )
}

/** Petición a una ruta pública (no usa la sesión del dueño para nada). */
export function publicRequest(method: string, path: string, body?: Cypress.RequestBody) {
    return backendApi(path).then((url) =>
        cy.request({ method, url, body, failOnStatusCode: false }),
    )
}

export function saveProgram(overrides: Record<string, unknown> = {}) {
    return owner('PUT', '/businesses/loyalty/program', programBody(overrides)).then((response) => {
        expect(response.status, JSON.stringify(response.body)).to.eq(200)
        return response
    })
}

let phoneSequence = 0
/** Teléfono de 10 dígitos que no se repite entre pruebas ni corridas. */
export function uniquePhone() {
    phoneSequence += 1
    const time = `${Date.now() % 1_000_000}`.padStart(6, '0')
    return `66${time}${String(phoneSequence % 100).padStart(2, '0')}`
}

export type SeedCustomer = { id: string; name: string; phone: string }

/** Cliente nuevo del negocio con la sesión actual (máximo 20 caracteres de nombre). */
export function createCustomer(
    business: LoyaltyBusiness,
    name = 'Ana López',
): Cypress.Chainable<SeedCustomer> {
    const phone = uniquePhone()
    return owner('POST', `/businesses/${business.businessId}/customers`, { name, phone }).then(
        (response) => {
            expect(response.status, JSON.stringify(response.body)).to.eq(201)
            const customer = unwrap(response.body, 'customer') as { id: string }
            return { id: customer.id, name, phone }
        },
    )
}

export function walkInStamp(customerId: string, note?: string) {
    return owner('POST', `/businesses/loyalty/customers/${customerId}/stamps`, note ? { note } : {})
}

/**
 * Cliente con `count` sellos dados en el local. Con 8 de 8 la tarjeta se completa: queda con
 * 0 sellos del ciclo nuevo y un premio disponible.
 */
export function customerWithStamps(
    business: LoyaltyBusiness,
    count: number,
    name = 'Ana López',
): Cypress.Chainable<SeedCustomer> {
    return createCustomer(business, name).then((customer) => {
        for (let index = 0; index < count; index += 1) {
            walkInStamp(customer.id).its('status').should('eq', 201)
        }
        return cy.wrap(customer)
    })
}

export function cardDetail(customerId: string) {
    return owner('GET', `/businesses/loyalty/cards/${customerId}`)
}

type OrderOptions = {
    customer?: { name: string; phone: string }
    quantity?: number
    paymentMethod?: 'CASH' | 'TRANSFER'
    loyalty?: { cardToken: string; rewardId: string; expectedDiscount: number }
}

/** Pedido público (sin sesión) en el negocio indicado. */
export function publicOrder(business: LoyaltyBusiness, options: OrderOptions = {}) {
    const customer = options.customer ?? { name: 'Cliente', phone: uniquePhone() }
    return publicRequest('POST', `/businesses/${business.businessId}/orders`, {
        customer: { name: customer.name, phone: customer.phone },
        items: [{ productId: business.productId, quantity: options.quantity ?? 1 }],
        fulfillmentType: 'PICKUP',
        paymentMethod: options.paymentMethod ?? 'CASH',
        ...(options.loyalty ? { loyalty: options.loyalty } : {}),
    })
}

export function setStatus(orderId: string, status: string) {
    return owner('PATCH', `/businesses/orders/${orderId}/status`, { status })
}

/** Pedido público finalizado ("Listo") del cliente; devuelve el id del pedido. */
export function finishedOrder(
    business: LoyaltyBusiness,
    customer: { name: string; phone: string } | null,
    quantity = 1,
): Cypress.Chainable<string> {
    const body = {
        customer: customer ? { name: customer.name, phone: customer.phone } : null,
        items: [{ productId: business.productId, quantity }],
        fulfillmentType: 'PICKUP',
    }
    if (!customer) {
        // Pedido de mostrador sin cliente: lo captura el restaurante sin teléfono.
        return owner('POST', `/businesses/${business.businessId}/orders/restaurant`, {
            customerName: null,
            customerPhone: null,
            items: body.items,
            fulfillmentType: 'PICKUP',
        }).then((response) => {
            expect(response.status, JSON.stringify(response.body)).to.eq(201)
            const id = response.body.order.id as string
            setStatus(id, 'PREPARING').its('status').should('eq', 200)
            setStatus(id, 'READY').its('status').should('eq', 200)
            return cy.wrap(id)
        })
    }
    return publicRequest('POST', `/businesses/${business.businessId}/orders`, body).then(
        (response) => {
            expect(response.status, JSON.stringify(response.body)).to.eq(201)
            const id = response.body.order.id as string
            setStatus(id, 'PREPARING').its('status').should('eq', 200)
            setStatus(id, 'READY').its('status').should('eq', 200)
            return cy.wrap(id)
        },
    )
}

export function stampOrder(orderId: string, body?: Cypress.RequestBody) {
    return owner('POST', `/businesses/orders/${orderId}/stamp`, body ?? {})
}

export function voidOrderStamp(orderId: string, reason = 'sello por error') {
    return owner('DELETE', `/businesses/orders/${orderId}/stamp`, { reason })
}

/** Token del cliente (lo lee el dueño en el detalle, para simular el link compartido). */
export function cardToken(customerId: string): Cypress.Chainable<string> {
    return cardDetail(customerId).then((response) => {
        expect(response.status).to.eq(200)
        return response.body.card.cardToken as string
    })
}

/** Premio disponible del cliente (requiere tarjeta completa). */
export function availableReward(
    customerId: string,
): Cypress.Chainable<{ id: string; label: string }> {
    return cardDetail(customerId).then((response) => {
        const reward = (
            response.body.rewards as { id: string; status: string; label: string }[]
        ).find((item) => item.status === 'AVAILABLE')
        expect(reward, 'premio disponible').not.to.equal(undefined)
        return { id: reward!.id, label: reward!.label }
    })
}

export function loginOwnerUi(business: LoyaltyBusiness) {
    cy.login({ email: business.email, password: LOYALTY_PASSWORD })
}
