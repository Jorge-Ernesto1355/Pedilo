import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const apiUrl = backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`
const email = process.env.E2E_SEED_EMAIL ?? 'cypress-dashboard-seed@pedilo.test'
const password = process.env.E2E_SEED_PASSWORD ?? 'Strong-pass-123'
const slug = process.env.E2E_SEED_SLUG ?? 'e2e-dashboard-restaurante'

const menus = [
    { name: 'E2E Desayunos', category: 'E2E Huevos y desayunos' },
    { name: 'E2E Comidas', category: 'E2E Platos fuertes' },
    { name: 'E2E Cenas', category: 'E2E Tacos y cenas' },
    { name: 'E2E Promociones', category: 'E2E Combos y extras' },
]

const products = [
    ['E2E Producto 01', 85],
    ['E2E Producto 02', 95],
    ['E2E Producto 03', 110],
    ['E2E Producto 04', 75],
    ['E2E Producto 05', 35],
    ['E2E Producto 06', 120],
    ['E2E Producto 07', 145],
    ['E2E Producto 08', 110],
    ['E2E Producto 09', 75],
    ['E2E Producto 10', 55],
    ['E2E Producto 11', 95],
    ['E2E Producto 12', 90],
    ['E2E Producto 13', 130],
    ['E2E Producto 14', 80],
    ['E2E Producto 15', 35],
    ['E2E Producto 16', 150],
    ['E2E Producto 17', 290],
    ['E2E Producto 18', 30],
    ['E2E Producto 19', 60],
    ['E2E Producto 20', 85],
].map(([name, price]) => ({ name, price }))

const cookieJar = new Map()

function updateCookies(response) {
    const setCookies = response.headers.getSetCookie?.() ?? []
    for (const value of setCookies) {
        const [pair] = value.split(';')
        const separator = pair.indexOf('=')
        if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
}

function cookieHeader() {
    return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('accept', 'application/json')
    const cookie = cookieHeader()
    if (cookie) headers.set('cookie', cookie)
    if (options.body && !(options.body instanceof FormData))
        headers.set('content-type', 'application/json')

    const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers,
        body:
            options.body && !(options.body instanceof FormData)
                ? JSON.stringify(options.body)
                : options.body,
    })
    updateCookies(response)

    const text = await response.text()
    let body = null
    try {
        body = text ? JSON.parse(text) : null
    } catch {
        body = text
    }
    if (!response.ok) {
        throw new Error(
            `${options.method ?? 'GET'} ${path} → ${response.status}: ${JSON.stringify(body)}`,
        )
    }
    return body
}

function unwrap(body, key) {
    if (body && typeof body === 'object' && body.data !== undefined) return unwrap(body.data, key)
    if (key && body && typeof body === 'object' && body[key] !== undefined) return body[key]
    return body
}

async function ensureAccount() {
    const login = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    updateCookies(login)
    if (login.ok) return

    if (login.status !== 401) {
        const details = await login.text()
        throw new Error(`No se pudo iniciar sesión en la cuenta E2E (${login.status}): ${details}`)
    }

    await request('/auth/register', {
        method: 'POST',
        body: { name: 'E2E Dashboard User', email, password },
    })
    await request('/auth/login', {
        method: 'POST',
        body: { email, password },
    })
}

function businessForm() {
    const form = new FormData()
    form.set('name', 'E2E Restaurante Dashboard')
    form.set('slug', slug)
    form.set('description', 'Escenario persistente para pruebas E2E del dashboard.')
    form.set('ubication', 'E2E Mazatlán')
    form.set(
        'businessSchedule',
        JSON.stringify({
            days: [
                { key: 'monday', label: 'Lun', enabled: true },
                { key: 'tuesday', label: 'Mar', enabled: true },
                { key: 'wednesday', label: 'Mié', enabled: true },
                { key: 'thursday', label: 'Jue', enabled: true },
                { key: 'friday', label: 'Vie', enabled: true },
                { key: 'saturday', label: 'Sáb', enabled: true },
                { key: 'sunday', label: 'Dom', enabled: true },
            ],
            openTime: '08:00',
            closeTime: '23:00',
        }),
    )
    return form
}

async function ensureBusiness() {
    let body
    try {
        body = await request('/businesses/mine')
    } catch (error) {
        if (!String(error).includes('404')) throw error
    }
    const existing = unwrap(body, 'business')
    if (existing) {
        if (existing.slug !== slug && existing.name !== 'E2E Restaurante Dashboard') {
            throw new Error(
                `La cuenta E2E ya tiene otro negocio (${existing.slug ?? existing.name}). Usa otra cuenta E2E.`,
            )
        }
        return existing
    }
    return unwrap(
        await request('/businesses', { method: 'POST', body: businessForm() }),
        'business',
    )
}

async function ensureSettings() {
    try {
        const settings = unwrap(await request('/businesses/settings'))
        if (settings?.whatsapp !== '6981119319') {
            await request('/businesses/settings', {
                method: 'PATCH',
                body: { whatsapp: '6981119319', currency: 'MXN', timezone: 'America/Mazatlan' },
            })
        }
    } catch (error) {
        if (!String(error).includes('404')) throw error
        await request('/businesses/settings', {
            method: 'POST',
            body: { whatsapp: '6981119319', currency: 'MXN', timezone: 'America/Mazatlan' },
        })
    }
}

async function ensureMenus(business) {
    const menuBody = unwrap(await request('/businesses/mine/menus'))
    const current = Array.isArray(menuBody) ? menuBody : (menuBody?.menus ?? [])
    const result = []
    for (const seed of menus) {
        let menu = current.find((item) => item.name === seed.name)
        if (!menu) {
            menu = unwrap(
                await request(`/businesses/${business.id}/menus`, {
                    method: 'POST',
                    body: {
                        name: seed.name,
                        description: `Datos E2E de ${seed.name}.`,
                        isActive: true,
                        categories: [
                            { name: seed.category, description: `Categoría E2E de ${seed.name}.` },
                        ],
                    },
                }),
                'menu',
            )
        }
        const category = (menu.categories ?? []).find((item) => item.name === seed.category)
        if (!category) {
            const created = unwrap(
                await request(`/businesses/${business.id}/categories`, {
                    method: 'POST',
                    body: {
                        menuId: menu.id,
                        name: seed.category,
                        description: `Categoría E2E de ${seed.name}.`,
                    },
                }),
                'category',
            )
            menu.categories = [...(menu.categories ?? []), created]
        }
        result.push({ ...seed, menu })
    }
    return result
}

async function ensureProducts(business, menuEntries) {
    const output = []
    for (const [menuIndex, entry] of menuEntries.entries()) {
        const category = entry.menu.categories.find((item) => item.name === entry.category)
        if (!category) throw new Error(`No se encontró la categoría E2E ${entry.category}`)
        const productBody = unwrap(await request(`/businesses/categories/${category.id}/products`))
        const current = Array.isArray(productBody) ? productBody : (productBody?.products ?? [])
        for (let index = 0; index < 5; index += 1) {
            const seed = products[menuIndex * 5 + index]
            let product = current.find((item) => item.name === seed.name)
            if (!product) {
                const form = new FormData()
                form.set('categoryId', category.id)
                form.set('name', seed.name)
                form.set('description', `${seed.name} para el escenario E2E.`)
                form.set('price', String(seed.price))
                form.set('active', 'true')
                product = unwrap(
                    await request(`/businesses/${business.id}/products`, {
                        method: 'POST',
                        body: form,
                    }),
                    'product',
                )
            }
            output.push(product)
        }
    }
    return output
}

function desiredStatus(index) {
    if (index < 26) return 'READY'
    if (index === 26) return 'PREPARING'
    return 'PENDING'
}

async function moveOrderToStatus(order, targetStatus) {
    if (order.status === targetStatus) return order

    const transitions = {
        PENDING: ['PREPARING', 'READY'],
        PREPARING: ['READY'],
    }

    if (targetStatus === 'PENDING') {
        throw new Error(
            `La orden ${order.id} está en ${order.status} y no puede regresar a PENDING. Usa una cuenta E2E nueva o limpia únicamente sus datos E2E.`,
        )
    }

    const nextStatuses = transitions[order.status]
    if (!nextStatuses?.includes(targetStatus)) {
        throw new Error(
            `No existe una transición E2E válida de ${order.status} a ${targetStatus} para la orden ${order.id}.`,
        )
    }

    let current = order
    for (const status of nextStatuses) {
        current = unwrap(
            await request(`/businesses/orders/${current.id}/status`, {
                method: 'PATCH',
                body: { status },
            }),
            'order',
        )
        if (status === targetStatus) break
    }
    return current
}

async function ensureOrders(business, seedProducts) {
    const existing = []
    for (let page = 1; page <= 10; page += 1) {
        const body = unwrap(
            await request(`/businesses/${business.id}/orders?page=${page}&limit=100`),
        )
        const pageOrders = body.orders ?? []
        existing.push(...pageOrders)
        if (pageOrders.length === 0 || existing.length >= (body.total ?? existing.length)) break
    }
    const orders = []
    for (let index = 0; index < 30; index += 1) {
        const customer = `E2E Cliente ${String(index + 1).padStart(2, '0')}`
        let order = existing.find((item) => item.customerName === customer)
        if (!order) {
            const product = seedProducts[index % seedProducts.length]
            const response = await request(`/businesses/${business.id}/orders`, {
                method: 'POST',
                body: {
                    customer: { name: customer, phone: `669800${String(index + 1000).slice(-4)}` },
                    items: [{ productId: product.id, quantity: (index % 4) + 1, optionIds: [] }],
                    notes: `Escenario E2E pedido ${index + 1}`,
                },
            })
            order = unwrap(response, 'order')
        }
        const status = desiredStatus(index)
        order = await moveOrderToStatus(order, status)
        orders.push(order)
    }
    return orders
}

async function main() {
    console.log(`Preparando escenario E2E para ${email}`)
    await ensureAccount()
    const business = await ensureBusiness()
    await ensureSettings()
    const menuEntries = await ensureMenus(business)
    const seedProducts = await ensureProducts(business, menuEntries)
    const orders = await ensureOrders(business, seedProducts)
    console.log(
        `Listo: negocio=${business.slug ?? slug}, menús=${menuEntries.length}, productos=${seedProducts.length}, órdenes=${orders.length}`,
    )
    console.log('El seed es idempotente: vuelve a ejecutarlo para reutilizar este escenario.')
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
})
