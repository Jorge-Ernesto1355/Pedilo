'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CircleDollarSign, CircleHelp, TrendingDown, TrendingUp } from 'lucide-react'
import type { SalesData } from '../dashboard-data/dashboardData.types'
import { formatMoney } from '../dashboard-data/formatters'
import { DashboardCardError } from '../../components/DashboardCardError'
import CountUp from './CountUp'

export function SalesKpiCard({
    data,
    currency = 'MXN',
    isLoading = false,
    isError = false,
    onRetry,
}: {
    data?: SalesData
    currency?: string
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
}) {
    const [comparisonOpen, setComparisonOpen] = useState(false)

    if (isError) {
        return (
            <SalesCardShell>
                <SalesCardHeader />
                <DashboardCardError
                    title="Ventas no disponibles"
                    description="No pudimos consultar las ventas de este periodo. Las demás tarjetas siguen disponibles."
                    onRetry={onRetry}
                />
            </SalesCardShell>
        )
    }

    if (isLoading || !data) {
        return (
            <SalesCardShell>
                <SalesCardHeader />
                <p className="mt-8 h-12 w-44 animate-pulse rounded-lg bg-[#DCE5F3]" />
            </SalesCardShell>
        )
    }

    const comparison = data.comparison
    const percentage = comparison?.percentage_change ?? data.trend ?? 0
    const currentTotal = Number(comparison?.current_total ?? data.total)
    const previousTotal = Number(comparison?.previous_total ?? data.previousTotal ?? 0)
    const noBaselineGrowth = previousTotal === 0 && currentTotal > 0
    const changeLabel = noBaselineGrowth
        ? `+${currentTotal.toLocaleString('en-US')}%`
        : `${percentage > 0 ? '+' : ''}${percentage}%`
    const trendColor =
        noBaselineGrowth || percentage > 0
            ? 'text-[#23814C]'
            : percentage < 0
              ? 'text-[#B54747]'
              : 'text-[#65738A]'
    const trendTone =
        noBaselineGrowth || percentage > 0
            ? 'bg-[#EAF7EF]'
            : percentage < 0
              ? 'bg-[#FDECEC]'
              : 'bg-[#EEF2F7]'
    const TrendIcon = noBaselineGrowth || percentage >= 0 ? TrendingUp : TrendingDown

    return (
        <SalesCardShell>
            <SalesCardHeader>
                <Link
                    href="/dashboard/sales"
                    className="group flex items-center gap-1.5 text-xs font-semibold text-[#65738A] hover:text-[#2451C5]"
                >
                    Ver ventas{' '}
                    <ArrowUpRight className="size-4 transition group-hover:text-[#2451C5]" />
                </Link>
            </SalesCardHeader>
            <p className="mt-7 text-sm font-medium text-[#65738A]">Ganancias del periodo</p>
            <p className="mt-1 font-display text-4xl tracking-[-.055em] text-[#12234A] sm:text-5xl">
                <CountUp
                    from={0}
                    to={data.total}
                    direction="up"
                    duration={1}
                    className="count-up-text"
                    delay={0}
                    formatValue={(value) => formatMoney(value, currency)}
                />
            </p>
            <div
                className="mt-6 border-t border-[#DCE5F3] pt-5"
                aria-label="Comparación con el periodo anterior"
            >
                <div className="flex items-center justify-between gap-4">
                    <div className={`flex items-center gap-2 ${trendColor}`}>
                        <span className={`grid size-8 place-items-center rounded-lg ${trendTone}`}>
                            <TrendIcon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="text-2xl font-bold tracking-[-.04em]">{changeLabel}</span>
                        <span className="text-sm font-semibold text-[#65738A]">
                            contra el periodo anterior
                        </span>
                    </div>
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            aria-label="Cómo se compara este porcentaje"
                            aria-expanded={comparisonOpen}
                            onClick={() => setComparisonOpen((open) => !open)}
                            className="grid size-8 place-items-center rounded-full text-[#65738A] transition hover:bg-white hover:text-[#2451C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2451C5]"
                        >
                            <CircleHelp className="size-5" aria-hidden="true" />
                        </button>
                        {comparisonOpen ? (
                            <div className="absolute right-0 top-10 z-10 w-72 rounded-xl border border-[#C9D7EA] bg-white p-4 text-left text-xs leading-5 text-[#65738A] shadow-[0_12px_28px_rgb(20_48_105_/_0.14)]">
                                <p className="font-semibold text-[#12234A]">
                                    ¿Contra qué se compara?
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                    <li>• Hoy: contra el día anterior.</li>
                                    <li>• 7 días: contra los 7 días previos.</li>
                                    <li>• 30 días: contra los 30 días anteriores.</li>
                                    <li>• Este mes: contra el mes anterior.</li>
                                </ul>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </SalesCardShell>
    )
}

function SalesCardShell({ children }: { children: ReactNode }) {
    return (
        <div className="h-full rounded-2xl border border-[#B9CBE9] bg-[#F5F8FF] p-6 shadow-[0_8px_22px_rgb(20_48_105_/_0.07)] sm:p-7">
            {children}
        </div>
    )
}

function SalesCardHeader({ children }: { children?: ReactNode }) {
    return (
        <div className="flex items-start justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2451C5] text-white">
                <CircleDollarSign className="size-5.5" />
            </span>
            {children ?? <span className="text-xs font-semibold text-[#65738A]">Ventas</span>}
        </div>
    )
}
