import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const projectDir = path.dirname(fileURLToPath(import.meta.url))
const repoDir = path.resolve(projectDir, '..')
const backendDir = process.env.PEDILO_BACKEND_DIR ?? path.resolve(repoDir, '..', 'PediloBackend')
const timezone = 'America/Mazatlan'
const seedMarker = 'PEDILO_DASHBOARD_SEED_V1'
const legacyMarker = 'E2E Cliente '
const email = process.env.E2E_SEED_EMAIL ?? 'cypress-dashboard-seed@pedilo.test'
const slug = process.env.E2E_SEED_SLUG ?? 'e2e-dashboard-restaurante'
const manifestPath = path.join(repoDir, 'test-results', 'dashboard-seed-manifest.json')

function readEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {}
    return Object.fromEntries(
        fs
            .readFileSync(filePath, 'utf8')
            .split(/\r?\n/)
            .flatMap((line) => {
                const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
                if (!match || match[1].startsWith('#')) return []
                return [[match[1], match[2].replace(/^['"]|['"]$/g, '')]]
            }),
    )
}

const backendEnv = readEnvFile(path.join(backendDir, '.env'))
const databaseUrl =
    process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? backendEnv.DATABASE_URL
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'

function databaseHost(value) {
    try {
        return new URL(value).hostname
    } catch {
        return null
    }
}

function assertSafeEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Abortado: no se permite ejecutar el seed con NODE_ENV=production.')
    }
    const host = databaseHost(databaseUrl ?? '')
    if (!host || !['localhost', '127.0.0.1', '::1'].includes(host)) {
        throw new Error(
            `Abortado: DATABASE_URL debe apuntar a una base local (host recibido: ${host ?? 'desconocido'}). Usa E2E_DATABASE_URL con PostgreSQL de pruebas local.`,
        )
    }
    const backendHost = databaseHost(backendUrl)
    if (backendHost && !['localhost', '127.0.0.1', '::1'].includes(backendHost)) {
        throw new Error(`Abortado: BACKEND_URL no es local (${backendUrl}).`)
    }
}

function localDate(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)
    return {
        year: Number(parts.find((part) => part.type === 'year')?.value),
        month: Number(parts.find((part) => part.type === 'month')?.value),
        day: Number(parts.find((part) => part.type === 'day')?.value),
    }
}

function offsetMs(instant) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(instant))
    const value = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0)
    return (
        Date.UTC(
            value('year'),
            value('month') - 1,
            value('day'),
            value('hour'),
            value('minute'),
            value('second'),
        ) - instant
    )
}

function zonedStart(parts) {
    const localUtc = Date.UTC(parts.year, parts.month - 1, parts.day)
    let instant = localUtc
    for (let index = 0; index < 3; index += 1) instant = localUtc - offsetMs(instant)
    return new Date(instant)
}

function addDays(parts, days) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function addMonths(parts, months) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1))
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function atLocal(parts, hour, minute = 0) {
    const localUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute)
    let instant = localUtc
    for (let index = 0; index < 3; index += 1) instant = localUtc - offsetMs(instant)
    return new Date(instant)
}

function range(period, now) {
    const today = localDate(now)
    const tomorrow = addDays(today, 1)
    if (period === 'today') return { start: zonedStart(today), end: zonedStart(tomorrow) }
    if (period === '7d') return { start: zonedStart(addDays(today, -6)), end: zonedStart(tomorrow) }
    if (period === '30d')
        return { start: zonedStart(addDays(today, -29)), end: zonedStart(tomorrow) }
    const monthStart = { year: today.year, month: today.month, day: 1 }
    if (period === 'thisMonth') return { start: zonedStart(monthStart), end: now }
    const previousMonth = addMonths(monthStart, -1)
    const previousEnd = addDays(
        previousMonth,
        Math.min(today.day, daysInMonth(previousMonth.year, previousMonth.month)),
    )
    return { start: zonedStart(previousMonth), end: zonedStart(previousEnd) }
}

function previousRange(period, now) {
    const today = localDate(now)
    if (period === 'today') return { start: zonedStart(addDays(today, -1)), end: zonedStart(today) }
    if (period === '7d')
        return { start: zonedStart(addDays(today, -13)), end: zonedStart(addDays(today, -6)) }
    if (period === '30d')
        return { start: zonedStart(addDays(today, -59)), end: zonedStart(addDays(today, -29)) }
    const monthStart = { year: today.year, month: today.month, day: 1 }
    const previousMonth = addMonths(monthStart, -1)
    const previousEnd = addDays(
        previousMonth,
        Math.min(today.day, daysInMonth(previousMonth.year, previousMonth.month)),
    )
    return { start: zonedStart(previousMonth), end: zonedStart(previousEnd) }
}

function inRange(date, periodRange) {
    const value = date.getTime()
    return value >= periodRange.start.getTime() && value < periodRange.end.getTime()
}

function orderBlueprints(now) {
    const today = localDate(now)
    const previousMonth = addMonths({ year: today.year, month: today.month, day: 1 }, -1)
    const dates = [
        ...Array.from({ length: 3 }, (_, index) => atLocal(today, 9 + index * 3)),
        ...Array.from({ length: 3 }, (_, index) => atLocal(addDays(today, -1), 11 + index * 2)),
        ...[-2, -3, -4, -5, -6].flatMap((days, dayIndex) =>
            [0, 1].map((itemIndex) => atLocal(addDays(today, days), 10 + dayIndex + itemIndex * 4)),
        ),
        ...[-8, -12, -16, -20, -24, -28].flatMap((days, dayIndex) =>
            [0, 1].map((itemIndex) => atLocal(addDays(today, days), 12 + dayIndex + itemIndex * 3)),
        ),
        atLocal({ year: today.year, month: today.month, day: Math.min(2, today.day) }, 14),
        ...[3, 10, 20].map((day) =>
            atLocal(
                {
                    ...previousMonth,
                    day: Math.min(day, daysInMonth(previousMonth.year, previousMonth.month)),
                },
                15,
            ),
        ),
    ]
    const cancelled = [
        atLocal(today, 17),
        atLocal(addDays(today, -3), 18),
        atLocal(addDays(today, -15), 16),
        atLocal(addDays(today, -35), 13),
        atLocal(
            {
                ...previousMonth,
                day: Math.min(8, daysInMonth(previousMonth.year, previousMonth.month)),
            },
            19,
        ),
    ]
    return [
        ...dates.map((createdAt, index) => ({
            createdAt,
            cancelled: false,
            pending: index === 0,
            index,
        })),
        ...cancelled.map((createdAt, index) => ({
            createdAt,
            cancelled: true,
            pending: false,
            index: dates.length + index,
        })),
    ]
}

function itemRecipes(products) {
    const available = products
    if (available.length < 17)
        throw new Error(
            'Se requieren al menos 17 productos E2E para cubrir productos de varias categorías y montos elevados. Ejecuta npm run e2e:seed primero.',
        )
    return [
        [{ product: available[0], quantity: 1 }],
        [
            { product: available[1], quantity: 2 },
            { product: available[4], quantity: 1 },
        ],
        [
            { product: available[2], quantity: 1 },
            { product: available[5], quantity: 2 },
        ],
        [
            { product: available[3], quantity: 3 },
            { product: available[6], quantity: 1 },
        ],
        [
            { product: available[16], quantity: 2 },
            { product: available[11], quantity: 1 },
        ],
    ]
}

function toNumber(value) {
    return typeof value?.toNumber === 'function' ? value.toNumber() : Number(value)
}

function buildExpected(orders, now) {
    const salesOrders = orders.filter(
        (order) => order.status === 'PREPARING' || order.status === 'READY',
    )
    const periods = {}
    for (const period of ['today', '7d', '30d', 'thisMonth', 'lastMonth']) {
        const current = salesOrders.filter((order) => inRange(order.createdAt, range(period, now)))
        const previous = salesOrders.filter((order) =>
            inRange(order.createdAt, previousRange(period, now)),
        )
        periods[period] = {
            total: current.reduce((sum, order) => sum + order.total, 0),
            orders: current.length,
            previousTotal: previous.reduce((sum, order) => sum + order.total, 0),
            previousOrders: previous.length,
        }
    }
    return periods
}

async function main() {
    assertSafeEnvironment()
    if (!fs.existsSync(backendDir)) throw new Error(`No se encontró el backend en ${backendDir}.`)
    if (!databaseUrl) throw new Error('No se encontró DATABASE_URL ni E2E_DATABASE_URL.')

    process.env.DATABASE_URL = databaseUrl
    const require = createRequire(path.join(backendDir, 'package.json'))
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const business = await prisma.business.findUnique({
            where: { slug },
            include: { users: { select: { email: true } } },
        })
        if (!business)
            throw new Error(`No existe el negocio E2E ${slug}. Ejecuta npm run e2e:seed primero.`)
        if (!business.users.some((user) => user.email === email)) {
            throw new Error(
                `El negocio ${slug} no pertenece a ${email}; se aborta para proteger otros datos.`,
            )
        }
        const products = await prisma.product.findMany({
            where: {
                businessId: business.id,
                name: { startsWith: 'E2E Producto ' },
                isAvailable: true,
            },
            orderBy: { name: 'asc' },
        })
        const recipes = itemRecipes(products)
        await prisma.order.deleteMany({
            where: {
                businessId: business.id,
                OR: [
                    { notes: { startsWith: seedMarker } },
                    { customerName: { startsWith: legacyMarker } },
                ],
            },
        })

        const blueprints = orderBlueprints(new Date())
        const created = await prisma.$transaction(async (tx) => {
            const last = await tx.order.aggregate({
                where: { businessId: business.id },
                _max: { orderNumber: true },
            })
            let orderNumber = (last._max.orderNumber ?? 0) + 1
            const result = []
            for (const blueprint of blueprints) {
                const recipe = recipes[blueprint.index % recipes.length]
                const items = recipe.map(({ product, quantity }) => ({
                    productId: product.id,
                    productName: product.name,
                    unitPrice: toNumber(product.price),
                    quantity,
                    subtotal: toNumber(product.price) * quantity,
                }))
                const total = items.reduce((sum, item) => sum + item.subtotal, 0)
                const status = blueprint.cancelled
                    ? 'CANCELLED'
                    : blueprint.pending
                      ? 'PENDING'
                      : blueprint.index % 3 === 0
                        ? 'PREPARING'
                        : 'READY'
                const history = [
                    { status: 'PENDING', createdAt: blueprint.createdAt },
                    ...(status === 'PENDING'
                        ? []
                        : [
                              {
                                  status,
                                  createdAt: new Date(blueprint.createdAt.getTime() + 10 * 60_000),
                              },
                          ]),
                ]
                const order = await tx.order.create({
                    data: {
                        businessId: business.id,
                        orderNumber,
                        status,
                        source: 'PUBLIC',
                        subtotal: total,
                        total,
                        customerName: `Dashboard Seed ${String(orderNumber).padStart(3, '0')}`,
                        customerPhone: `669900${String(orderNumber).padStart(4, '0').slice(-4)}`,
                        notes: `${seedMarker} · escenario=${blueprint.cancelled ? 'cancelled' : blueprint.pending ? 'pending' : 'sale'}`,
                        createdAt: blueprint.createdAt,
                        updatedAt: new Date(blueprint.createdAt.getTime() + 10 * 60_000),
                        items: { create: items },
                        statusHistory: { create: history },
                    },
                    include: { items: true },
                })
                result.push({
                    id: order.id,
                    orderNumber,
                    createdAt: blueprint.createdAt,
                    status,
                    total,
                    cancelled: blueprint.cancelled,
                    items: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                })
                orderNumber += 1
            }
            return result
        })

        const now = new Date()
        fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
        fs.writeFileSync(
            manifestPath,
            `${JSON.stringify({ seedMarker, email, businessId: business.id, slug, timezone, generatedAt: now.toISOString(), orders: created, expected: buildExpected(created, now) }, null, 2)}\n`,
        )
        console.log(`Seed dashboard listo: ${created.length} pedidos históricos en ${slug}.`)
        console.log(`Manifest: ${manifestPath}`)
        console.log(JSON.stringify(buildExpected(created, now), null, 2))
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
})
