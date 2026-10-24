'use client'

import { RefreshCw } from 'lucide-react'

export function DashboardCardError({
    title,
    description = 'No pudimos cargar este dato.',
    onRetry,
    isRetrying = false,
}: {
    title: string
    description?: string
    onRetry?: () => void
    isRetrying?: boolean
}) {
    return (
        <div className="mt-5 rounded-xl border border-[#F1D6C5] bg-[#FFF8F3] p-4">
            <p className="text-sm font-semibold text-[#8C4A2F]">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[#9B6B58]">{description}</p>
            {onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={isRetrying}
                    aria-busy={isRetrying}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#E6BCA5] bg-white px-3 py-2 text-xs font-semibold text-[#8C4A2F] transition hover:bg-[#FFF0E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C4A2F] disabled:cursor-wait disabled:opacity-60"
                >
                    <RefreshCw
                        className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                    />
                    {isRetrying ? 'Reintentando…' : 'Reintentar'}
                </button>
            ) : null}
        </div>
    )
}
