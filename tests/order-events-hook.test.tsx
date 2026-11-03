import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/src/lib/api/order-types'
import { useAuthStore } from '@/store/authStore'
import { useOrderEventsStore } from '@/store/orderEventsStore'
import { getOrder } from '@/src/lib/api/orderApi'
import { useOrderEvents } from '@/app/(protected)/dashboard/features/orders/useOrderEvents'

const stream = vi.hoisted(() => ({
    onOrder: undefined as ((data: string) => void) | undefined,
}))
const navigation = vi.hoisted(() => ({ path: '/dashboard' }))

vi.mock('next/navigation', () => ({
    usePathname: () => navigation.path,
}))

vi.mock(
    '@/app/(protected)/dashboard/features/orders/services/orderEvents',
    async (importOriginal) => {
        const actual =
            await importOriginal<
                typeof import('@/app/(protected)/dashboard/features/orders/services/orderEvents')
            >()
        return {
            ...actual,
            readOrderEventStream: ({
                signal,
                onOpen,
                onOrder,
            }: {
                signal: AbortSignal
                onOpen: () => void
                onOrder: (data: string) => void
            }) => {
                stream.onOrder = onOrder
                onOpen()
                return new Promise<void>((resolve) =>
                    signal.addEventListener('abort', () => resolve(), { once: true }),
                )
            },
        }
    },
)

vi.mock('@/src/lib/api/orderApi', () => ({ getOrder: vi.fn() }))
vi.mock('@/app/(protected)/dashboard/features/orders/services/orderSound', () => ({
    playOrderSound: vi.fn(async () => true),
    stopOrderSound: vi.fn(),
    unlockOrderSound: vi.fn(),
}))

const order: Order = {
    id: 'order-1',
    businessId: 'business-1',
    orderNumber: 14,
    status: 'PENDING',
    source: 'PUBLIC',
    customerId: null,
    subtotal: 120,
    total: 120,
    customerName: 'Cliente',
    customerPhone: null,
    notes: null,
    fulfillmentType: 'PICKUP',
    items: [{ productId: 'product-1', quantity: 1 }],
    statusHistory: [],
}

describe('useOrderEvents', () => {
    beforeEach(() => {
        stream.onOrder = undefined
        navigation.path = '/dashboard'
        useAuthStore.getState().setUser({
            id: 'user-1',
            name: 'Restaurante',
            email: 'restaurant@example.com',
            businessId: 'business-1',
        })
        useOrderEventsStore.getState().resetForScope(null)
        vi.mocked(getOrder).mockReset().mockResolvedValue(order)
    })

    it('fetches and caches one complete order per SSE event, recording its unseen ID once', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
        const { unmount } = renderHook(() => useOrderEvents(), { wrapper })

        await waitFor(() => expect(stream.onOrder).toBeTypeOf('function'))
        await act(async () => {
            stream.onOrder?.('{"id":"order-1","restaurantId":"business-1"}')
        })
        await waitFor(() =>
            expect(queryClient.getQueryData(['order', 'user-1', 'business-1', 'order-1'])).toEqual(
                order,
            ),
        )
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual(['order-1'])

        await act(async () => {
            stream.onOrder?.('{"id":"order-1","restaurantId":"business-1"}')
        })
        expect(getOrder).toHaveBeenCalledTimes(1)
        expect(useOrderEventsStore.getState().toastOrderIds).toEqual(['order-1'])

        unmount()
        queryClient.clear()
    })

    it('does not notify or play sound for restaurant-created orders', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
        vi.mocked(getOrder).mockResolvedValue({
            ...order,
            id: 'order-restaurant',
            source: 'RESTAURANT',
        })
        const { unmount } = renderHook(() => useOrderEvents(), { wrapper })

        await waitFor(() => expect(stream.onOrder).toBeTypeOf('function'))
        await act(async () => {
            stream.onOrder?.('{"id":"order-restaurant","restaurantId":"business-1"}')
        })
        await waitFor(() =>
            expect(
                queryClient.getQueryData(['order', 'user-1', 'business-1', 'order-restaurant']),
            ).toEqual({ ...order, id: 'order-restaurant', source: 'RESTAURANT' }),
        )
        expect(useOrderEventsStore.getState().toastOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().recentOrderIds).toEqual([])

        unmount()
        queryClient.clear()
    })

    it('syncs a public order inside Pedidos without creating a badge or toast', async () => {
        navigation.path = '/dashboard/orders'
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        )
        const { unmount } = renderHook(() => useOrderEvents(), { wrapper })

        await waitFor(() => expect(stream.onOrder).toBeTypeOf('function'))
        await act(async () => {
            stream.onOrder?.('{"id":"order-1","restaurantId":"business-1","source":"PUBLIC"}')
        })
        await waitFor(() => expect(getOrder).toHaveBeenCalledWith('order-1', expect.anything()))
        expect(useOrderEventsStore.getState().unseenOrderIds).toEqual([])
        expect(useOrderEventsStore.getState().toastOrderIds).toEqual([])

        unmount()
        queryClient.clear()
    })
})
