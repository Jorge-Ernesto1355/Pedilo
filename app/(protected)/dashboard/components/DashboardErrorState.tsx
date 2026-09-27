'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

type DashboardErrorStateProps = {
    title: string
    description: string
    onRetry: () => void | Promise<void>
}

export function DashboardErrorState({ title, description, onRetry }: DashboardErrorStateProps) {
    return (
        <section
            className="rounded-2xl border border-[#F0D7D7] bg-[#FFF9F9] px-6 py-8 text-center shadow-[0_12px_30px_rgb(155_61_61_/_0.06)] sm:px-10"
            role="alert"
        >
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#FCE7E7] text-[#B42318]">
                <AlertTriangle className="size-6" />
            </span>
            <h2 className="mt-5 font-display text-2xl tracking-[-.04em] text-[#6F2525]">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8F4A4A]">{description}</p>
            <button
                type="button"
                onClick={() => void onRetry()}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#B42318] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#941B13] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B42318]/20"
            >
                <RefreshCw className="size-4" />
                Intentar de nuevo
            </button>
        </section>
    )
}
