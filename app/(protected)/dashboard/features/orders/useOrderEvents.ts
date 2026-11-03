'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useOrderEventsStore } from '@/store/orderEventsStore'
import { getOrder } from '@/src/lib/api/orderApi'
import type { Order } from '@/src/lib/api/order-types'
import { reconcileOrderStatusInCache } from './orderStatusSync'
import {
    getOrderSoundPreferenceKey,
    getReconnectDelay,
    OrderEventsHttpError,
    parseNewOrderEvent,
    parseOrderStatusEvent,
    readOrderEventStream,
} from './services/orderEvents'
import { playOrderSound, stopOrderSound, unlockOrderSound } from './services/orderSound'

function isOrder(value: Order, id: string, businessId: string) {
    return (
        value.id === id &&
        (!value.businessId || value.businessId === businessId) &&
        Number.isFinite(value.orderNumber) &&
        ['PENDING', 'PREPARING', 'READY', 'CANCELLED'].includes(value.status) &&
        Array.isArray(value.items)
    )
}

export function useOrderEvents() {
    const user = useAuthStore((state) => state.user)
    const queryClient = useQueryClient()
    const businessId = user?.businessId ?? null
    const userId = user?.id ?? null
    const pathname = usePathname()

    useEffect(() => {
        const scopeKey = userId && businessId ? `${userId}:${businessId}` : null
        const store = useOrderEventsStore.getState()
        store.resetForScope(scopeKey)
        if (!scopeKey || !businessId) return
        const activeBusinessId = businessId
        const shouldNotify = !pathname.startsWith('/dashboard/orders')

        try {
            const saved = window.localStorage.getItem(getOrderSoundPreferenceKey(businessId))
            if (saved !== null) useOrderEventsStore.getState().setSoundEnabled(saved === 'true')
        } catch {
            // The stream still works when browser storage is unavailable.
        }

        let disposed = false
        let successfulConnections = 0
        let attempt = 0
        let controller: AbortController | null = null
        const seenIds = new Set<string>()
        const inFlight = new Set<string>()
        const highlightTimers = new Map<string, number>()

        const unlock = () => {
            unlockOrderSound()
            useOrderEventsStore.getState().setSoundUnlocked(true)
        }
        window.addEventListener('pointerdown', unlock, { once: true, passive: true })
        window.addEventListener('keydown', unlock, { once: true })

        async function processOrder(raw: string) {
            const payload = parseNewOrderEvent(raw, activeBusinessId)
            if (!payload || seenIds.has(payload.id) || inFlight.has(payload.id)) return
            seenIds.add(payload.id)
            if (seenIds.size > 1000) {
                const oldestId = seenIds.values().next().value
                if (oldestId) seenIds.delete(oldestId)
            }
            inFlight.add(payload.id)
            const fetchController = new AbortController()
            const streamSignal = controller?.signal
            const abortOrderFetch = () => fetchController.abort()
            if (streamSignal?.aborted) abortOrderFetch()
            else streamSignal?.addEventListener('abort', abortOrderFetch, { once: true })
            try {
                const order = await getOrder(payload.id, fetchController.signal)
                if (disposed || fetchController.signal.aborted) return
                if (!isOrder(order, payload.id, activeBusinessId)) {
                    void queryClient.invalidateQueries({ queryKey: ['orders', activeBusinessId] })
                    return
                }
                queryClient.setQueryData(
                    ['order', userId ?? 'anonymous', activeBusinessId, order.id],
                    order,
                )
                void queryClient.invalidateQueries({ queryKey: ['orders', activeBusinessId] })
                // The persisted order is authoritative. The event source is a fast
                // filter, while missing/legacy sources remain safe by default.
                const orderSource = order.source ?? payload.source
                if (orderSource !== 'PUBLIC' || payload.source === 'RESTAURANT') return
                const isNew = useOrderEventsStore.getState().recordOrder(order.id, {
                    notify: shouldNotify,
                })
                if (!isNew) return
                if (useOrderEventsStore.getState().soundEnabled) void playOrderSound()
                highlightTimers.set(
                    order.id,
                    window.setTimeout(() => {
                        useOrderEventsStore.getState().clearHighlight(order.id)
                        highlightTimers.delete(order.id)
                    }, 20_000),
                )
            } catch {
                if (!disposed && !fetchController.signal.aborted) {
                    seenIds.delete(payload.id)
                    void queryClient.invalidateQueries({ queryKey: ['orders', activeBusinessId] })
                }
            } finally {
                streamSignal?.removeEventListener('abort', abortOrderFetch)
                inFlight.delete(payload.id)
            }
        }

        function processStatus(raw: string) {
            const event = parseOrderStatusEvent(raw, activeBusinessId)
            if (!event) return
            const result = reconcileOrderStatusInCache(
                queryClient,
                activeBusinessId,
                userId ?? 'anonymous',
                {
                    id: event.id,
                    orderNumber: event.orderNumber,
                    status: event.status,
                    updatedAt: event.updatedAt,
                    statusRevision: event.statusRevision,
                },
            )
            if (!result.previousOrder)
                void queryClient.invalidateQueries({ queryKey: ['orders', activeBusinessId] })
        }

        async function connect() {
            while (!disposed) {
                controller = new AbortController()
                useOrderEventsStore
                    .getState()
                    .setConnection(attempt ? 'reconnecting' : 'connecting')
                try {
                    await readOrderEventStream({
                        signal: controller.signal,
                        onOpen: () => {
                            const wasReconnect = successfulConnections > 0
                            successfulConnections += 1
                            attempt = 0
                            useOrderEventsStore.getState().setReconnectAttempts(0)
                            useOrderEventsStore.getState().setConnection('connected')
                            if (wasReconnect)
                                void queryClient.invalidateQueries({
                                    queryKey: ['orders', activeBusinessId],
                                })
                        },
                        onOrder: (data) => void processOrder(data),
                        onStatus: processStatus,
                    })
                } catch (error) {
                    if (disposed || controller.signal.aborted) break
                    if (error instanceof OrderEventsHttpError && error.status === 401) {
                        useAuthStore.getState().clearUser()
                        useOrderEventsStore.getState().setConnection('error', 'La sesión expiró.')
                        window.location.replace('/auth/login')
                        break
                    }
                    if (error instanceof OrderEventsHttpError && error.status === 403) {
                        useOrderEventsStore
                            .getState()
                            .setConnection(
                                'error',
                                'No tienes acceso a las actualizaciones de este negocio.',
                            )
                        break
                    }
                    attempt += 1
                    useOrderEventsStore.getState().setReconnectAttempts(attempt)
                    useOrderEventsStore.getState().setConnection('reconnecting')
                    await new Promise<void>((resolve) => {
                        const timeout = window.setTimeout(resolve, getReconnectDelay(attempt))
                        controller?.signal.addEventListener(
                            'abort',
                            () => {
                                window.clearTimeout(timeout)
                                resolve()
                            },
                            { once: true },
                        )
                    })
                }
            }
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible')
                void queryClient.invalidateQueries({ queryKey: ['orders', activeBusinessId] })
        }
        document.addEventListener('visibilitychange', handleVisibility)
        void connect()

        return () => {
            disposed = true
            controller?.abort()
            window.removeEventListener('pointerdown', unlock)
            window.removeEventListener('keydown', unlock)
            document.removeEventListener('visibilitychange', handleVisibility)
            highlightTimers.forEach((timer) => window.clearTimeout(timer))
            highlightTimers.clear()
            stopOrderSound()
            inFlight.clear()
        }
    }, [businessId, pathname, queryClient, userId])
}
