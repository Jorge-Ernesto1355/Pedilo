import { getBackendUrl } from '@/lib/auth/config'
import type { OrderSource, OrderStatus } from '@/src/lib/api/order-types'

export type NewOrderEventPayload = {
    id: string
    restaurantId?: string
    eventId?: string
    type?: 'new_order'
    source?: OrderSource
}

export type OrderStatusEventPayload = {
    id: string
    restaurantId: string
    eventId: string
    status: OrderStatus
    orderNumber: number
    updatedAt: string
    statusRevision: number
    type: 'order_status_updated'
}

export class OrderEventsHttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message)
        this.name = 'OrderEventsHttpError'
    }
}

export function getOrderEventsUrl() {
    return `${getBackendUrl()}/api/orders/events`
}

export function parseNewOrderEvent(data: string, businessId: string): NewOrderEventPayload | null {
    let payload: unknown
    try {
        payload = JSON.parse(data)
    } catch {
        return null
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
    const value = payload as Record<string, unknown>
    const id = typeof value.orderId === 'string' ? value.orderId : value.id
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id.trim())) return null
    if (value.type !== undefined && value.type !== 'new_order') return null
    if (value.restaurantId !== undefined && value.restaurantId !== businessId) return null
    if (value.source !== undefined && value.source !== 'PUBLIC' && value.source !== 'RESTAURANT')
        return null
    return {
        id: id.trim(),
        ...(typeof value.restaurantId === 'string' ? { restaurantId: value.restaurantId } : {}),
        ...(typeof value.eventId === 'string' ? { eventId: value.eventId } : {}),
        ...(value.source === 'PUBLIC' || value.source === 'RESTAURANT'
            ? { source: value.source }
            : {}),
        type: 'new_order',
    }
}

export function parseOrderStatusEvent(
    data: string,
    businessId: string,
): OrderStatusEventPayload | null {
    let payload: unknown
    try {
        payload = JSON.parse(data)
    } catch {
        return null
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
    const value = payload as Record<string, unknown>
    const id = typeof value.orderId === 'string' ? value.orderId : value.id
    const statuses: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'CANCELLED']
    if (
        typeof id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(id.trim()) ||
        value.type !== 'order_status_updated' ||
        value.restaurantId !== businessId ||
        typeof value.eventId !== 'string' ||
        typeof value.updatedAt !== 'string' ||
        !Number.isInteger(value.orderNumber) ||
        Number(value.orderNumber) < 1 ||
        !Number.isInteger(value.statusRevision) ||
        Number(value.statusRevision) < 1 ||
        !statuses.includes(value.status as OrderStatus)
    )
        return null
    return {
        id: id.trim(),
        restaurantId: businessId,
        eventId: value.eventId,
        status: value.status as OrderStatus,
        orderNumber: Number(value.orderNumber),
        updatedAt: value.updatedAt,
        statusRevision: Number(value.statusRevision),
        type: 'order_status_updated',
    }
}

function parseFrame(frame: string) {
    let eventName = 'message'
    const data: string[] = []
    for (const line of frame.split(/\r?\n/)) {
        if (!line || line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'event') eventName = value
        else if (field === 'data') data.push(value)
    }
    return data.length ? { eventName, data: data.join('\n') } : null
}

export async function readOrderEventStream({
    signal,
    onOpen,
    onOrder,
    onStatus,
}: {
    signal: AbortSignal
    onOpen: () => void
    onOrder: (data: string) => void
    onStatus?: (data: string) => void
}) {
    const response = await fetch(getOrderEventsUrl(), {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        credentials: 'include',
        cache: 'no-store',
        signal,
    })
    if (response.status === 401 || response.status === 403)
        throw new OrderEventsHttpError(
            response.status,
            'La sesión no tiene acceso a las actualizaciones de pedidos.',
        )
    if (!response.ok)
        throw new OrderEventsHttpError(response.status, `El stream respondió ${response.status}.`)
    if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream'))
        throw new Error('El servidor no devolvió un stream de eventos válido.')
    if (!response.body) throw new Error('El navegador no puede leer el stream de eventos.')

    onOpen()
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
        while (!signal.aborted) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            if (buffer.length > 65_536)
                throw new Error('El evento recibido excede el tamaño permitido.')
            let separator = /\r?\n\r?\n/.exec(buffer)
            while (separator?.index !== undefined) {
                const frame = buffer.slice(0, separator.index)
                buffer = buffer.slice(separator.index + separator[0].length)
                const parsed = parseFrame(frame)
                if (parsed?.eventName === 'new_order') onOrder(parsed.data)
                else if (parsed?.eventName === 'order_status_updated') onStatus?.(parsed.data)
                separator = /\r?\n\r?\n/.exec(buffer)
            }
        }
        if (!signal.aborted) throw new Error('El stream de eventos se cerró.')
    } finally {
        try {
            await reader.cancel()
        } catch {
            // The server or browser may already have closed the stream.
        }
        reader.releaseLock()
    }
}

export function getReconnectDelay(attempt: number, random = Math.random()) {
    const base = Math.min(1000 * 2 ** Math.max(0, attempt - 1), 30_000)
    return Math.min(30_000, Math.round(base * (0.75 + random * 0.5)))
}

export function getOrderSoundPreferenceKey(businessId: string) {
    return `pedilo:order-sound:${businessId}`
}
