'use client'

import Link from 'next/link'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import type { OrdersData } from '../dashboard-data/dashboardData.types'
import { DashboardCardError } from '../../components/DashboardCardError'

export function OrdersKpiCard({
    data,
    compact = false,
    isLoading = false,
    isError = false,
    onRetry,
}: {
    data: OrdersData
    compact?: boolean
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
}) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]">
                <span className="size-9 shrink-0 animate-pulse rounded-xl bg-[#EEF2F7]" />
                <span className="h-8 w-40 animate-pulse rounded-lg bg-[#EEF2F7]" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]">
                <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF8F2] text-[#23814C]">
                        <ShoppingBag className="size-5" />
                    </span>
                    <span className="text-sm font-semibold text-[#243556]">Pedidos</span>
                </div>
                <DashboardCardError
                    title="Pedidos no disponibles"
                    description="No pudimos cargar este indicador en este momento."
                    onRetry={onRetry}
                />
            </div>
        )
    }

    return (
        <Link
            href="/dashboard/orders"
            className={`group block rounded-2xl border border-[#DCE5F3] bg-white shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:shadow-[0_12px_28px_rgb(20_48_105_/_0.09)] ${compact ? 'flex items-center gap-3 p-4' : 'p-5'}`}
        >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF8F2] text-[#23814C]">
                <ShoppingBag className="size-5" />
            </span>
            <span className={compact ? 'flex min-w-0 flex-1 flex-col gap-1' : 'block'}>
                <span
                    className={
                        compact ? 'text-sm text-[#65738A]' : 'mt-6 block text-sm text-[#65738A]'
                    }
                >
                    Pedidos
                </span>
                <span className={compact ? 'flex items-baseline gap-2 whitespace-nowrap' : 'block'}>
                    <span
                        className={
                            compact
                                ? 'font-display text-2xl tracking-[-.04em] text-[#12234A]'
                                : 'mt-1 block font-display text-2xl tracking-[-.04em] text-[#12234A]'
                        }
                    >
                        {data.total}
                    </span>
                    <span
                        className={
                            compact ? 'text-xs text-[#8996A9]' : 'mt-2 block text-xs text-[#8996A9]'
                        }
                    >
                        en este periodo
                    </span>
                </span>
            </span>
            <ArrowUpRight className="ml-auto size-4 shrink-0 text-[#8996A9] transition group-hover:text-[#2451C5]" />
        </Link>
    )
}
