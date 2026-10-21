'use client'

import type { ReactNode } from 'react'
import {
    Construction,
    LoaderCircle,
    QrCode,
    RefreshCw,
    Star,
    TrendingDown,
    TrendingUp,
} from 'lucide-react'
import { useGoogleReviewsStats } from './useGoogleReviewsStats'
import type { GoogleReviewsStatsPeriod } from './googleReviewsStats'

export interface QRAnalyticsCardProps {
    totalScans: number
    uniqueClients: number
    percentageChange: number
    onRetry?: () => void
    isLoading?: boolean
    rating?: number
    monthlyReviewsCount?: number
    reviewHistory?: number[]
    isError?: boolean
}

export function GoogleReviewsStatsCard({ period }: { period: GoogleReviewsStatsPeriod }) {
    const statsQuery = useGoogleReviewsStats(period)
    const stats = statsQuery.data?.data

    return (
        <div className="min-w-0">
            <QRAnalyticsCard
                totalScans={stats?.total_scans ?? 0}
                uniqueClients={stats?.unique_visitors_estimated ?? 0}
                percentageChange={stats?.comparison_percentage ?? 0}
                onRetry={() => void statsQuery.refetch()}
                isLoading={statsQuery.isFetching}
                isError={statsQuery.isError}
            />
        </div>
    )
}

export function QRAnalyticsCard({
    totalScans,
    uniqueClients,
    percentageChange,
    onRetry,
    isLoading = false,
    rating = 0,
    monthlyReviewsCount = 0,
    reviewHistory,
    isError = false,
}: QRAnalyticsCardProps) {
    const isRetrying = isLoading && Boolean(onRetry)
    const chartValues = reviewHistory?.length ? reviewHistory.slice(-8) : [2, 3, 1, 4, 3, 2, 4, 3]
    const maxChartValue = Math.max(...chartValues, 1)
    const isNegative = percentageChange < 0
    const hasChange = Number.isFinite(percentageChange) && percentageChange !== 0
    const ComparisonIcon = isNegative ? TrendingDown : TrendingUp

    return (
        <section
            className="min-w-0 rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-5"
            aria-labelledby="google-reviews-stats-title"
            aria-busy={isLoading}
        >
            <header className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                        <QrCode className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#2451C5]">
                            Google Reviews
                        </p>
                        <h2
                            id="google-reviews-stats-title"
                            className="mt-0.5 truncate font-display text-base tracking-[-.03em] text-[#12234A] sm:text-lg"
                        >
                            Reseñas y escaneos QR
                        </h2>
                    </div>
                </div>
                {onRetry ? (
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#D7E1EF] bg-white px-3 py-2 text-xs font-semibold text-[#243556] transition hover:bg-[#F5F8FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]/25 disabled:cursor-wait disabled:opacity-60"
                    >
                        {isRetrying ? (
                            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">Reintentar</span>
                    </button>
                ) : null}
            </header>

            <div className="relative mt-5 overflow-hidden rounded-xl border border-[#E8EEF6]">
                <div
                    aria-hidden="true"
                    className="grid gap-5 p-5 opacity-35 blur-[1px] sm:grid-cols-[.85fr_1.15fr] sm:items-center sm:gap-8"
                >
                    <div>
                        <p className="text-xs font-medium text-[#65738A]">Calificación promedio</p>
                        <div className="mt-2 flex items-center gap-2">
                            <Star
                                className={`size-7 ${rating > 0 ? 'fill-[#E9B949] text-[#E9B949]' : 'fill-[#E6EBF3] text-[#B8C3D4]'}`}
                                aria-hidden="true"
                            />
                            <span className="font-display text-4xl tracking-[-.06em] text-[#12234A]">
                                {rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-[#8996A9]">/ 5</span>
                        </div>
                        <p className="mt-2 text-xs text-[#65738A]">
                            {formatCount(monthlyReviewsCount)} reseñas este mes
                        </p>
                    </div>
                    <div
                        className="min-w-0 rounded-xl bg-[#F8FAFE] px-3 pb-3 pt-4"
                        role="img"
                        aria-label="Historial reciente de reseñas"
                    >
                        <div className="flex h-24 items-end gap-2">
                            {chartValues.map((value, index) => (
                                <span
                                    key={`${value}-${index}`}
                                    className="min-w-0 flex-1 rounded-t-md bg-[#B9D0FF] transition-[height] duration-300"
                                    style={{ height: `${Math.max((value / maxChartValue) * 100, 8)}%` }}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#8996A9]">
                            <span>Hace 7 días</span>
                            <span>Hoy</span>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 grid place-items-center bg-white/70 px-5 text-center backdrop-blur-[2px]">
                    <div className="max-w-sm">
                        <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                            <Construction className="size-5" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#2451C5]">
                            En construcción
                        </p>
                        <h3 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">
                            Reseñas de Google próximamente
                        </h3>
                        <p className="mt-1.5 text-xs leading-5 text-[#65738A]">
                            Estamos esperando la aprobación de tu negocio. Google puede tardar hasta
                            60 días en habilitar esta información.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-5 border-t border-[#E8EEF6] pt-4">
                <div className="flex items-center gap-2">
                    <QrCode className="size-4 text-[#2451C5]" aria-hidden="true" />
                    <h3 className="text-xs font-semibold text-[#243556]">Seguimiento del QR</h3>
                </div>
                {isError ? (
                    <div className="mt-4 rounded-xl border border-dashed border-[#E4C5B7] bg-[#FFFAF7] px-4 py-4 text-center" role="alert">
                        <p className="text-xs font-semibold text-[#713C2C]">No pudimos cargar los datos del QR</p>
                        <p className="mt-1 text-[11px] leading-4 text-[#8D685B]">Las métricas se actualizarán al reintentar.</p>
                    </div>
                ) : (
                    <div className="mt-4 grid grid-cols-3 divide-x divide-[#E8EEF6]">
                        <Metric label="Escaneos totales" value={formatCount(totalScans)} />
                        <Metric label="Clientes únicos" value={formatCount(uniqueClients)} />
                        <Metric
                            label="vs. mes anterior"
                            value={hasChange ? formatPercentage(percentageChange) : '—'}
                            icon={hasChange ? <ComparisonIcon className={`size-4 ${isNegative ? 'text-[#B54747]' : 'text-[#23814C]'}`} aria-hidden="true" /> : undefined}
                            valueClassName={hasChange ? (isNegative ? 'text-[#B54747]' : 'text-[#23814C]') : undefined}
                        />
                    </div>
                )}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#F8FAFE] px-3.5 py-3 text-[11px] leading-4 text-[#65738A]">
                    <QrCode className="mt-0.5 size-4 shrink-0 text-[#2451C5]" aria-hidden="true" />
                    <p>
                        <span className="font-semibold text-[#243556]">Sobre estos datos: </span>
                        los escaneos y clientes únicos se calculan con la actividad registrada desde
                        tu código QR.
                    </p>
                </div>
            </div>
        </section>
    )
}

function Metric({
    label,
    value,
    icon,
    valueClassName,
}: {
    label: string
    value: string
    icon?: ReactNode
    valueClassName?: string
}) {
    return (
        <div className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-4">
            <div className="flex items-center gap-1">
                {icon}
                <p className={`truncate font-display text-xl tracking-[-.05em] text-[#12234A] ${valueClassName ?? ''}`}>
                    {value}
                </p>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[#65738A] sm:text-xs">{label}</p>
        </div>
    )
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

function formatPercentage(value: number) {
    return `${new Intl.NumberFormat('es-MX', { signDisplay: 'always', maximumFractionDigits: 1 }).format(value)}%`
}
