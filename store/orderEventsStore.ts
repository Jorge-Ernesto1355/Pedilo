import { create } from 'zustand'

export type OrderEventsConnectionStatus =
    'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

type OrderEventsState = {
    scopeKey: string | null
    connectionStatus: OrderEventsConnectionStatus
    lastConnectedAt: string | null
    reconnectAttempts: number
    lastError: string | null
    lastEventAt: string | null
    unseenOrderIds: string[]
    recentOrderIds: string[]
    toastOrderIds: string[]
    toastRevision: number
    soundEnabled: boolean
    soundUnlocked: boolean
    resetForScope: (scopeKey: string | null) => void
    setConnection: (status: OrderEventsConnectionStatus, error?: string | null) => void
    setReconnectAttempts: (attempts: number) => void
    recordOrder: (orderId: string, options?: { notify?: boolean }) => boolean
    markReviewed: (orderIds: string[]) => void
    dismissToast: () => void
    clearHighlight: (orderId: string) => void
    setSoundEnabled: (enabled: boolean) => void
    setSoundUnlocked: (unlocked: boolean) => void
}

export const useOrderEventsStore = create<OrderEventsState>((set, get) => ({
    scopeKey: null,
    connectionStatus: 'disconnected',
    lastConnectedAt: null,
    reconnectAttempts: 0,
    lastError: null,
    lastEventAt: null,
    unseenOrderIds: [],
    recentOrderIds: [],
    toastOrderIds: [],
    toastRevision: 0,
    soundEnabled: true,
    soundUnlocked: false,
    resetForScope: (scopeKey) => {
        if (get().scopeKey === scopeKey) {
            set({ toastOrderIds: [], toastRevision: 0 })
            return
        }
        set({
            scopeKey,
            connectionStatus: scopeKey ? 'connecting' : 'disconnected',
            lastConnectedAt: null,
            reconnectAttempts: 0,
            lastError: null,
            lastEventAt: null,
            unseenOrderIds: [],
            recentOrderIds: [],
            toastOrderIds: [],
            toastRevision: 0,
            soundEnabled: true,
            soundUnlocked: false,
        })
    },
    setConnection: (connectionStatus, lastError = null) =>
        set(() => ({
            connectionStatus,
            lastError,
            ...(connectionStatus === 'connected'
                ? { lastConnectedAt: new Date().toISOString() }
                : {}),
        })),
    setReconnectAttempts: (reconnectAttempts) => set({ reconnectAttempts }),
    recordOrder: (orderId, options = {}) => {
        const state = get()
        if (state.recentOrderIds.includes(orderId)) return false
        const notify = options.notify ?? true
        set({
            unseenOrderIds: notify ? [...state.unseenOrderIds, orderId] : state.unseenOrderIds,
            recentOrderIds: [...state.recentOrderIds.slice(-199), orderId],
            toastOrderIds: notify ? [...new Set([...state.toastOrderIds, orderId])] : state.toastOrderIds,
            toastRevision: notify ? state.toastRevision + 1 : state.toastRevision,
            lastEventAt: new Date().toISOString(),
        })
        return true
    },
    markReviewed: (orderIds) => {
        if (!orderIds.length) return
        const reviewed = new Set(orderIds)
        set((state) => ({ unseenOrderIds: state.unseenOrderIds.filter((id) => !reviewed.has(id)) }))
    },
    dismissToast: () => set({ toastOrderIds: [] }),
    clearHighlight: (orderId) =>
        set((state) => ({ recentOrderIds: state.recentOrderIds.filter((id) => id !== orderId) })),
    setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    setSoundUnlocked: (soundUnlocked) => set({ soundUnlocked }),
}))
