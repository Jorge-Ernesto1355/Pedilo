'use client'

import { CircleHelp, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ReactNode } from 'react'
import type { SalesData, SalesPoint, SalesSeriesPoint } from '../dashboard-data/dashboardData.types'
import { DashboardCardError } from '../../components/DashboardCardError'
import { formatMoney } from '../dashboard-data/formatters'

export function TrendKpiCard({
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
    const [infoOpen, setInfoOpen] = useState(false)

    if (isError) {
        return (
            <TrendCardShell>
                <DashboardCardError
                    title="Tendencia no disponible"
                    description="No pudimos comparar tus ventas. Las demás métricas siguen disponibles."
                    onRetry={onRetry}
                />
            </TrendCardShell>
        )
    }

    if (isLoading || !data) {
        return (
            <TrendCardShell>
                <p className="mt-8 h-9 w-28 animate-pulse rounded-lg bg-[#EEF2F7]" />
            </TrendCardShell>
        )
    }

    const percentage = data.comparison?.percentage_change ?? data.trend ?? 0
    const currentTotal = Number(data.comparison?.current_total ?? data.total)
    const previousTotal = Number(data.comparison?.previous_total ?? data.previousTotal ?? 0)
    const noBaselineGrowth = previousTotal === 0 && currentTotal > 0
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

function MiniTrendChart({ data, currency = 'MXN' }: { data: SalesData; currency?: string }) {
    const current = data.series?.current ?? data.points ?? []
    const previous = data.series?.previous ?? []
    const length = Math.max(current.length, previous.length)

    const points = Array.from({ length }, (_, index) => ({
        label: current[index]?.label ?? previous[index]?.label ?? `Intervalo ${index + 1}`,
        current: toNumber(current[index]?.sales) ?? 0,
        previous: toNumber(previous[index]?.sales) ?? 0,
        currentOrders:
            data.tooltip?.[index]?.current?.orders_count ??
            data.tooltip?.[index]?.current?.orderCount ??
            orderCount(current[index]),
        previousOrders:
            data.tooltip?.[index]?.previous?.orders_count ??
            data.tooltip?.[index]?.previous?.orderCount ??
            orderCount(previous[index]),
        difference: data.tooltip?.[index]?.difference ?? null,
        percentage: data.tooltip?.[index]?.percentage_change ?? null,
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
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points} margin={{ top: 3, right: 2, bottom: 1, left: 2 }}>
                        <Tooltip
                            cursor={{ stroke: '#DCE5F3', strokeDasharray: '3 3' }}
                            content={<MiniTrendTooltip currency={currency} />}
                        />
                        <Line
                            type="monotone"
                            dataKey="current"
                            stroke="#2451C5"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3, fill: '#fff', stroke: '#2451C5', strokeWidth: 2 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="previous"
                            stroke="#A7B7CF"
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                            dot={false}
                            activeDot={{ r: 3, fill: '#fff', stroke: '#8996A9', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function MiniTrendTooltip({
    active,
    payload,
    currency,
}: {
    active?: boolean
    currency: string
    payload?: Array<{
        payload?: {
            label?: string
            current?: number
            previous?: number
            currentOrders?: number
            previousOrders?: number
            difference?: number | string | null
            percentage?: number | null
        }
    }>
}) {
    if (!active || !payload?.length || !payload[0]?.payload) return null
    const point = payload[0].payload

    const previous = point.previous ?? 0
    const difference = point.difference ?? (point.current ?? 0) - previous

    return (
        <div className="rounded-lg border border-[#DCE5F3] bg-white px-2 py-1.5 text-[10px] text-[#12234A] shadow-sm">
            <p className="font-semibold text-[#65738A]">{point.label}</p>
            <p>Actual: {formatMoney(point.current ?? 0, currency)}</p>
            <p>Anterior: {formatMoney(previous, currency)}</p>
            <p>Diferencia: {formatMoney(Number(difference) || 0, currency)}</p>
            <p>
                Pedidos: {point.currentOrders ?? 0} / {point.previousOrders ?? 0}
            </p>
            {point.percentage !== null && point.percentage !== undefined && previous !== 0 ? (
                <p>
                    Variación: {point.percentage > 0 ? '+' : ''}
                    {point.percentage}%
                </p>
            ) : null}
        </div>
    )
}

function toNumber(value: SalesSeriesPoint['sales'] | undefined) {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function orderCount(point: SalesSeriesPoint | SalesPoint | undefined) {
    if (!point) return 0
    return 'orders_count' in point ? (point.orders_count ?? 0) : point.orderCount
}

function TrendCardShell({ children }: { children: ReactNode }) {
    return (
        <article className="relative h-full rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
            {children}
        </article>
    )
}
