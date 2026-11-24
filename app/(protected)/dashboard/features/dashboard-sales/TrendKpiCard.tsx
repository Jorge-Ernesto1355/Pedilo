'use client'

import { CircleHelp, TrendingDown, TrendingUp } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import type { TrendDashboardResponse, TrendPoint } from '../dashboard-data/dashboardData.types'
import { DashboardCardError } from '../../components/DashboardCardError'
import type { MiniTrendPoint } from './MiniTrendLineChart'

// recharts se descarga aparte: la tarjeta (y la página) se pintan sin esperarlo.
const LazyMiniTrendLineChart = lazy(() => import('./MiniTrendLineChart'))

export function TrendKpiCard({
    data,
    currency = 'MXN',
    isLoading = false,
    isError = false,
    onRetry,
    isRetrying = false,
}: {
    data?: TrendDashboardResponse
    currency?: string
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
    isRetrying?: boolean
}) {
    const [infoOpen, setInfoOpen] = useState(false)

    if (isError) {
        return (
            <TrendCardShell>
                <DashboardCardError
                    title="Tendencia no disponible"
                    description="No pudimos comparar tus ventas. Las demás métricas siguen disponibles."
                    onRetry={onRetry}
                    isRetrying={isRetrying}
                />
            </TrendCardShell>
        )
    }

    if (isLoading || !data) {
        // Misma estructura que la tarjeta cargada para no mover el layout al llegar.
        return (
            <TrendCardShell busy>
                <div className="flex items-start justify-between gap-4">
                    <span className="size-10 animate-pulse rounded-xl bg-[#EEF2F7]" />
                </div>
                <p className="mt-6 text-sm text-[#65738A]">Tendencia</p>
                <span className="mt-1 block h-9 w-28 animate-pulse rounded-lg bg-[#EEF2F7]" />
                <span className="mt-2 block h-4 w-36 animate-pulse rounded bg-[#F3F6FA]" />
                <div className="mt-4 border-t border-[#EEF2F7] pt-3">
                    <span className="mb-2 block h-[15px] w-28 animate-pulse rounded bg-[#F3F6FA]" />
                    <span className="block h-14 w-full animate-pulse rounded-lg bg-[#F3F6FA]" />
                </div>
            </TrendCardShell>
        )
    }

    const percentage = data.comparison.percentage_change ?? data.trend
    const currentTotal = data.comparison.current_total
    const previousTotal = data.comparison.previous_total
    const noBaselineGrowth = data.comparison.status === 'NO_BASELINE' && currentTotal > 0
    const isPositive = noBaselineGrowth || percentage > 0
    const isNegative = percentage < 0
    const TrendIcon = isNegative ? TrendingDown : TrendingUp
    const tone = isPositive
        ? { text: 'text-[#23814C]', bg: 'bg-[#EAF7EF]' }
        : isNegative
          ? { text: 'text-[#B54747]', bg: 'bg-[#FDECEC]' }
          : { text: 'text-[#65738A]', bg: 'bg-[#EEF2F7]' }

    return (
        <TrendCardShell>
            <div className="flex items-start justify-between gap-4">
                <span
                    className={`grid size-10 place-items-center rounded-xl ${tone.bg} ${tone.text}`}
                >
                    <TrendIcon className="size-5" aria-hidden="true" />
                </span>
                <div className="relative">
                    <button
                        type="button"
                        aria-label="Qué significa tendencia"
                        aria-expanded={infoOpen}
                        onClick={() => setInfoOpen((open) => !open)}
                        className="grid size-8 place-items-center rounded-full text-[#65738A] transition hover:bg-[#EEF2F7] hover:text-[#2451C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2451C5]"
                    >
                        <CircleHelp className="size-5" aria-hidden="true" />
                    </button>
                    {infoOpen ? (
                        <div className="absolute right-0 top-10 z-10 w-72 rounded-xl border border-[#C9D7EA] bg-white p-4 text-left text-xs leading-5 text-[#65738A] shadow-[0_12px_28px_rgb(20_48_105_/_0.14)]">
                            <p className="font-semibold text-[#12234A]">
                                ¿Qué significa tendencia?
                            </p>
                            <p className="mt-2">
                                Es el cambio porcentual de tus ventas en el periodo seleccionado
                                frente al periodo anterior equivalente.
                            </p>
                            <p className="mt-2">
                                Un porcentaje positivo indica que vendiste más; uno negativo, menos.
                                No representa la utilidad neta.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
            <p className="mt-6 text-sm text-[#65738A]">Tendencia</p>
            <p className={`mt-1 font-display text-3xl tracking-[-.05em] ${tone.text}`}>
                {noBaselineGrowth
                    ? `+${currentTotal.toLocaleString('en-US')}%`
                    : `${isPositive ? '+' : ''}${percentage}%`}
            </p>
            <p className="mt-2 text-xs text-[#8996A9]">
                {noBaselineGrowth
                    ? 'Nuevo crecimiento'
                    : previousTotal === 0
                      ? 'Sin base de comparación'
                      : 'contra el periodo anterior'}
            </p>
            <MiniTrendChart data={data} currency={currency} />
        </TrendCardShell>
    )
}

function MiniTrendChart({
    data,
    currency = 'MXN',
}: {
    data: TrendDashboardResponse
    currency?: string
}) {
    const current = data.series.current
    const previous = data.series.previous
    const length = Math.max(current.length, previous.length)

    const points: MiniTrendPoint[] = Array.from({ length }, (_, index) => ({
        label: current[index]?.label ?? previous[index]?.label ?? `Intervalo ${index + 1}`,
        current: toNumber(current[index]?.sales) ?? 0,
        previous: toNumber(previous[index]?.sales) ?? 0,
        currentOrders: data.tooltip[index]?.current_orders_count ?? orderCount(current[index]),
        previousOrders: data.tooltip[index]?.previous_orders_count ?? orderCount(previous[index]),
        difference: data.tooltip[index]?.difference ?? null,
        percentage: data.tooltip[index]?.percentage_change ?? null,
    }))

    if (!points.length) return null

    return (
        <div
            className="mt-4 border-t border-[#EEF2F7] pt-3"
            aria-label="Comparación visual de ventas"
        >
            <div className="mb-2 flex items-center gap-3 text-[10px] font-semibold text-[#8996A9]">
                <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#2451C5]" aria-hidden="true" />
                    Actual
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[#A7B7CF]" aria-hidden="true" />
                    Anterior
                </span>
            </div>
            <div className="h-14 w-full min-w-0">
                <Suspense
                    fallback={
                        <div className="h-full w-full animate-pulse rounded-lg bg-[#F3F6FA]" />
                    }
                >
                    <LazyMiniTrendLineChart points={points} currency={currency} />
                </Suspense>
            </div>
        </div>
    )
}

function toNumber(value: number | undefined) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function orderCount(point: TrendPoint | undefined) {
    if (!point) return 0
    return point.orderCount
}

function TrendCardShell({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
    return (
        <article
            aria-busy={busy || undefined}
            className="relative h-full rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"
        >
            {children}
        </article>
    )
}
