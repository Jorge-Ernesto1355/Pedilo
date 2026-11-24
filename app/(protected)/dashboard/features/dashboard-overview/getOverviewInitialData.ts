import { cookies } from 'next/headers'
import { getApiBaseUrl } from '@/lib/auth/config'
import type {
    AverageTicketResponse,
    HistoricalSalesResponse,
    SalesDashboardResponse,
} from '../dashboard-data/dashboardData.types'

// Solo servidor (usa next/headers). Datos prioritarios del resumen para el periodo por
// defecto ("today"), pedidos en paralelo mientras se renderiza la página. Se envían en el
// mismo HTML por streaming, así que las cifras no esperan a que el navegador descargue e
// hidrate el JS (en redes lentas eso son varios segundos).
export type OverviewInitialData = {
    sales: SalesDashboardResponse | null
    averageTicket: AverageTicketResponse | null
    historicalSales: HistoricalSalesResponse | null
}

// Si el backend tarda más, la sección se muestra sin datos y el cliente los pide como antes.
const SERVER_FETCH_TIMEOUT_MS = 3000

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

// Solo los campos que usa la tarjeta: la respuesta real no incluye `points`.
function isSalesResponse(value: unknown): value is SalesDashboardResponse {
    return (
        isObject(value) && typeof value.total === 'number' && typeof value.ordersCount === 'number'
    )
}

function isAverageTicketResponse(value: unknown): value is AverageTicketResponse {
    return (
        isObject(value) &&
        isObject(value.data) &&
        isObject(value.data.current) &&
        isObject(value.data.comparison)
    )
}

function isHistoricalSalesResponse(value: unknown): value is HistoricalSalesResponse {
    return (
        isObject(value) &&
        typeof value.historicalSales === 'number' &&
        typeof value.historicalOrderCount === 'number'
    )
}

async function fetchJson<T>(
    path: string,
    cookieHeader: string,
    isValid: (value: unknown) => value is T,
): Promise<T | null> {
    try {
        const response = await fetch(`${getApiBaseUrl()}${path}`, {
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
            cache: 'no-store',
            signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
        })
        if (!response.ok) return null
        const body: unknown = await response.json()
        return isValid(body) ? body : null
    } catch {
        // Timeout o error de red: el cliente hará su propia consulta y mostrará el error.
        return null
    }
}

export async function getOverviewInitialData(): Promise<OverviewInitialData> {
    const cookieHeader = (await cookies()).toString()
    const [sales, averageTicket, historicalSales] = await Promise.all([
        fetchJson('/dashboard/sales?period=today', cookieHeader, isSalesResponse),
        fetchJson('/analytics/average-ticket?period=today', cookieHeader, isAverageTicketResponse),
        fetchJson('/dashboard/historical-sales', cookieHeader, isHistoricalSalesResponse),
    ])
    return { sales, averageTicket, historicalSales }
}
