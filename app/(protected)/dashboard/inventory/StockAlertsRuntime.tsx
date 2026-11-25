'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, X } from 'lucide-react'
import { useStockAlertsStore, type StockAlertToast } from '@/store/stockAlertsStore'
import { alertCopy, formatQuantity } from './inventoryFormat'

const AUTO_DISMISS_MS = 12_000

/** Global notice for inventory alerts. Mounted once in the protected layout. */
export function StockAlertsRuntime() {
    const toasts = useStockAlertsStore((state) => state.toasts)
    const dismiss = useStockAlertsStore((state) => state.dismiss)
    if (!toasts.length) return null

    return (
        <div
            className="pointer-events-none fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 right-4 z-[110] flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-[22rem]"
            data-testid="stock-alerts"
        >
            {toasts.map((toast) => (
                <AlertCard key={toast.key} toast={toast} onDismiss={() => dismiss(toast.key)} />
            ))}
        </div>
    )
}

function AlertCard({ toast, onDismiss }: { toast: StockAlertToast; onDismiss: () => void }) {
    useEffect(() => {
        const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS)
        return () => window.clearTimeout(timer)
    }, [onDismiss])

    const severe = toast.level === 'OUT' || toast.level === 'CRITICAL'
    const detail =
        toast.kind === 'CONSUMPTION'
            ? `Se está usando más de lo normal. Quedan ${formatQuantity(toast.stock, toast.unit)}.`
            : toast.level === 'OUT'
              ? 'Ya no queda stock.'
              : `Quedan ${formatQuantity(toast.stock, toast.unit)}.`

    return (
        <section
            role="status"
            aria-live="polite"
            data-testid="stock-alert-toast"
            data-level={toast.level}
            className="pointer-events-auto rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_12px_36px_rgb(18_35_74_/_0.16)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
        >
            <div className="flex items-start gap-3">
                <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${severe ? 'bg-[#FCE7E7] text-[#B42318]' : 'bg-[#FFF3D6] text-[#8A5E0B]'}`}
                >
                    <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#12234A]">
                        {alertCopy(toast.kind, toast.level)}: {toast.ingredientName}
                    </p>
                    <p className="mt-1 text-sm text-[#65738A]">{detail}</p>
                    <Link
                        href="/dashboard/inventory"
                        onClick={onDismiss}
                        className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#2451C5] outline-none hover:text-[#173A9C] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#2451C5]"
                    >
                        Ver inventario <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Cerrar aviso de inventario"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[#8996A9] hover:bg-[#F2F5FA] hover:text-[#243556] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
        </section>
    )
}
