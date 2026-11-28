import { create } from 'zustand'
import type { StockAlertEventPayload } from '@/app/(protected)/dashboard/inventory/stockAlerts'

const MAX_TOASTS = 3

export type StockAlertToast = StockAlertEventPayload & { key: string }

type StockAlertsState = {
    scopeKey: string | null
    toasts: StockAlertToast[]
    resetForScope: (scopeKey: string | null) => void
    pushAlert: (alert: StockAlertEventPayload) => void
    dismiss: (key: string) => void
    clear: () => void
}

export const useStockAlertsStore = create<StockAlertsState>((set, get) => ({
    scopeKey: null,
    toasts: [],
    resetForScope: (scopeKey) => {
        if (get().scopeKey === scopeKey) return
        set({ scopeKey, toasts: [] })
    },
    pushAlert: (alert) =>
        set((state) => {
            // An escalation (low -> critical) replaces the earlier notice for the same alert.
            const key = `${alert.alertId}:${alert.level}`
            if (state.toasts.some((toast) => toast.key === key)) return state
            const rest = state.toasts.filter((toast) => toast.alertId !== alert.alertId)
            return { toasts: [...rest, { ...alert, key }].slice(-MAX_TOASTS) }
        }),
    dismiss: (key) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.key !== key) })),
    clear: () => set({ toasts: [] }),
}))
