import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    OrderEventsHttpError,
    parseNewOrderEvent,
    getReconnectDelay,
    readOrderEventStream,
} from '@/app/(protected)/dashboard/features/orders/services/orderEvents'
import { useOrderEventsStore } from '@/store/orderEventsStore'

describe('order event payloads', () => {
    it('accepts the backend orderId payload and the documented id payload', () => {
        expect(
            parseNewOrderEvent(
                '{"orderId":"order_123","restaurantId":"business-1","source":"PUBLIC"}',
                'business-1',
            )
                ?.id,
        ).toBe('order_123')
        expect(parseNewOrderEvent('{"id":"order_123"}', 'business-1')?.id).toBe('order_123')
        expect(
            parseNewOrderEvent(
                '{"id":"order_123","source":"RESTAURANT"}',
                'business-1',
            )?.source,
        ).toBe('RESTAURANT')
    })

    it.each([
        'not json',
        '{}',
        '{"id":" "}',
        '{"id":"bad id"}',
        '{"id":"order_1","type":"heartbeat"}',
        '{"id":"order_1","restaurantId":"other-business"}',
        '{"id":"order_1","source":"UNKNOWN"}',
    ])('rejects invalid or cross-business payload %s', (payload) => {
        expect(parseNewOrderEvent(payload, 'business-1')).toBeNull()
    })

    it('uses progressively longer delays with a 30 second cap and jitter', () => {
        expect(getReconnectDelay(1, 0.5)).toBe(1000)
        expect(getReconnectDelay(2, 0.5)).toBe(2000)
        expect(getReconnectDelay(20, 0)).toBe(22500)
        expect(getReconnectDelay(20, 1)).toBe(30000)
    })

    it('reads order and status SSE frames and ignores heartbeat comments', async () => {
        const controller = new AbortController()
        const orders: string[] = []
        const statuses: string[] = []
        const body = new ReadableStream<Uint8Array>({
            start(stream) {
                stream.enqueue(
                    new TextEncoder().encode(
                        ': heartbeat\n\nevent: new_order\ndata: {"id":"order-1"}\n\nevent: order_status_updated\ndata: {"id":"order-1"}\n\n',
                    ),
                )
                stream.close()
            },
        })
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'text/event-stream' }),
                body,
            }),
        )

        await readOrderEventStream({
            signal: controller.signal,
            onOpen: () => undefined,
            onOrder: (data) => {
                orders.push(data)
                controller.abort()
            },
            onStatus: (data) => statuses.push(data),
        })

        expect(orders).toEqual(['{"id":"order-1"}'])
        expect(statuses).toEqual(['{"id":"order-1"}'])
        vi.unstubAllGlobals()
    })

    it.each([401, 403])('rejects unauthorized SSE response with HTTP status %s', async (status) => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ status, headers: new Headers(), body: null }),
        )
        await expect(
            readOrderEventStream({
                signal: new AbortController().signal,
                onOpen: () => undefined,
                onOrder: () => undefined,
            }),
        ).rejects.toMatchObject({ status } satisfies Partial<OrderEventsHttpError>)
        vi.unstubAllGlobals()
    })

    it('rejects an SSE response with an invalid content type', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                body: null,
            }),
        )
        await expect(
            readOrderEventStream({
                signal: new AbortController().signal,
                onOpen: () => undefined,
                onOrder: () => undefined,
            }),
        ).rejects.toThrow('stream de eventos válido')
        vi.unstubAllGlobals()
    })
})

describe('order event store', () => {
    beforeEach(() => useOrderEventsStore.getState().resetForScope(null))

    it('deduplicates incoming orders and keeps unseen IDs until reviewed', () => {
        const store = useOrderEventsStore.getState()
        store.resetForScope('user-1:business-1')
        expect(store.recordOrder('order-1')).toBe(true)
        expect(useOrderEventsStore.getState().recordOrder('order-1')).toBe(false)
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual(['order-1'])
        useOrderEventsStore.getState().markReviewed(['order-1'])
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual([])
    })

    it('can mark an order as processed without creating badge or toast state', () => {
        useOrderEventsStore.getState().resetForScope('user-1:business-1')
        expect(
            useOrderEventsStore.getState().recordOrder('order-in-orders', { notify: false }),
        ).toBe(true)
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().toastOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().recentOrderIds).toEqual(['order-in-orders'])
    })

    it('clears notification state when the authenticated business changes', () => {
        useOrderEventsStore.getState().resetForScope('user-1:business-1')
        useOrderEventsStore.getState().recordOrder('order-1')
        useOrderEventsStore.getState().resetForScope('user-2:business-2')
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().scopeKey).toBe('user-2:business-2')
    })

    it('clears stale toasts when the same dashboard scope mounts again', () => {
        useOrderEventsStore.getState().resetForScope('user-1:business-1')
        useOrderEventsStore.getState().recordOrder('order-1')
        useOrderEventsStore.getState().resetForScope('user-1:business-1')
        expect(useOrderEventsStore.getState().toastOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().recentOrderIds).toEqual(['order-1'])
    })
})
