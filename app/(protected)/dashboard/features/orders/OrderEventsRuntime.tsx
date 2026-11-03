'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, BellRing, X } from 'lucide-react'
import { useOrderEventsStore } from '@/store/orderEventsStore'
import { useOrderEvents } from './useOrderEvents'

export function OrderEventsRuntime() {
    useOrderEvents()
    const ids = useOrderEventsStore((state) => state.toastOrderIds)
    const revision = useOrderEventsStore((state) => state.toastRevision)
    const dismiss = useOrderEventsStore((state) => state.dismissToast)

    useEffect(() => {
        if (!ids.length) return
        const timer = window.setTimeout(dismiss, 8000)
        return () => window.clearTimeout(timer)
    }, [dismiss, ids.length, revision])

    if (!ids.length) return null
    const count = ids.length
    const label = count === 1 ? 'Nueva orden' : `${count} nuevas órdenes`

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[120] w-[min(22rem,calc(100vw-2rem))] sm:right-6 sm:top-6">
            <section
                role="status"
                aria-live="polite"
                className="pointer-events-auto rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_12px_36px_rgb(18_35_74_/_0.16)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2"
            >
                <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                        <BellRing className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#12234A]">{label}</p>
                        <p className="mt-1 text-sm text-[#65738A]">
                            {count === 1
                                ? 'Ya puedes revisar el pedido que acaba de llegar.'
                                : 'Ya puedes revisar los pedidos que acaban de llegar.'}
                        </p>
                        <Link
                            href="/dashboard/orders"
                            onClick={dismiss}
                            className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#2451C5] outline-none hover:text-[#173A9C] focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#2451C5]"
                        >
                            Ver pedidos <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Cerrar aviso de nueva orden"
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[#8996A9] hover:bg-[#F2F5FA] hover:text-[#243556] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]"
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </section>
        </div>
    )
}
