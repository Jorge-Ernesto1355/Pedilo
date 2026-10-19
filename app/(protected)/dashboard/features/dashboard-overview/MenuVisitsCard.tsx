'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import {
    LoaderCircle,
    Minus,
    RefreshCw,
    Store,
    TrendingDown,
    TrendingUp,
    UsersRound,
} from 'lucide-react'
import { useStoreVisitsStats } from './useStoreVisitsStats'
import type {
    StoreVisitSeriesGranularity,
    StoreVisitSeriesPoint,
    StoreVisitsPeriod,
    StoreVisitsStats,
} from './storeVisitsStats'

type ChartInterval = {
    label: string
    previousLabel: string | null
    currentVisits: number
    previousVisits: number
}

export function MenuVisitsCard({ period = 'today' }: { period?: StoreVisitsPeriod }) {
    const visitsQuery = useStoreVisitsStats(period)
    const stats = visitsQuery.data?.data

    return (
        <section
            className="min-w-0 rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-5"
            aria-labelledby="menu-visits-title"
        >
            <header className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF8F2] text-[#34714B]">
                    <Store className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#477A5E]">
                        Tráfico del menú
                    </p>
                    <h2
                        id="menu-visits-title"
                        className="mt-0.5 truncate font-display text-base tracking-[-.03em] text-[#12234A] sm:text-lg"
                    >
                        Visitas a la tienda
                    </h2>
                </div>
            </header>

            {visitsQuery.isPending ? (
                <LoadingState />
            ) : visitsQuery.isError ? (
                <ErrorState
                    isRetrying={visitsQuery.isFetching}
                    onRetry={() => void visitsQuery.refetch()}
                />
            ) : stats ? (
                <StatsContent stats={stats} />
            ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#DCE5F3] bg-[#FBFCFE] p-5 text-center text-sm text-[#65738A]">
                    No hay estadísticas disponibles para este periodo.
                </div>
            )}
        </section>
    )
}

function LoadingState() {
    return (
        <div
            className="mt-4 space-y-4"
            aria-live="polite"
            aria-label="Cargando visitas a la tienda"
        >
            <div className="grid grid-cols-2 gap-2.5">
                <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
                <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
            </div>
            <div className="h-[190px] animate-pulse rounded-xl bg-[#F3F6FA]" />
            <span className="sr-only">Cargando visitas…</span>
        </div>
    )
}

function ErrorState({ isRetrying, onRetry }: { isRetrying: boolean; onRetry: () => void }) {
    return (
        <div
            className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4C5B7] bg-[#FFFAF7] px-4 py-6 text-center"
            role="alert"
        >
            <span className="grid size-11 place-items-center rounded-full bg-[#FFF0E8] text-[#9B4E35]">
                <Store className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-[#713C2C]">
                No pudimos cargar las visitas
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#8D685B]">
                Esta sección no está disponible por ahora. Las demás métricas siguen funcionando.
            </p>
            <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E6BCA5] bg-white px-4 py-2 text-sm font-semibold text-[#8C4A2F] transition hover:bg-[#FFF0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C4A2F] disabled:cursor-wait disabled:opacity-70"
            >
                {isRetrying ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                )}
                Reintentar
            </button>
        </div>
    )
}

function StatsContent({ stats }: { stats: StoreVisitsStats }) {
    const comparison = stats.comparison
    const hasComparison = comparison.has_previous_data && comparison.percentage_change !== null
    const isDown = comparison.direction === 'down'
    const isUp = comparison.direction === 'up'
    const ComparisonIcon = isDown
        ? TrendingDown
        : comparison.direction === 'flat'
          ? Minus
          : TrendingUp
    const comparisonColor = !hasComparison
        ? 'text-[#7A879A]'
        : isDown
          ? 'text-[#B54747]'
          : isUp
            ? 'text-[#23814C]'
            : 'text-[#65738A]'
    const intervals = buildChartIntervals(stats.series.current, stats.series.previous)
    const noVisits =
        stats.total_visits === 0 && stats.series.current.every((interval) => interval.visits === 0)
    const chartUnit = stats.series.granularity === 'hour' ? 'hora' : 'día'

    return (
        <div className="mt-4">
            <div className="grid grid-cols-2 gap-2.5">
                <article className="min-w-0 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3 sm:p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#65738A]">
                        <Store className="size-3.5 shrink-0 text-[#34714B]" aria-hidden="true" />
                        <span>Visitas a la tienda</span>
                    </div>
                    <p className="mt-1 font-display text-2xl tracking-[-.05em] text-[#12234A]">
                        {formatCount(stats.total_visits)}
                    </p>
                    <div
                        className={`mt-0.5 flex min-h-5 items-center gap-1 text-[10px] font-semibold leading-4 ${comparisonColor}`}
                    >
                        {!hasComparison ? (
                            <span>Sin datos suficientes para comparar</span>
                        ) : (
                            <>
                                <ComparisonIcon className="size-3.5" aria-hidden="true" />
                                <span>
                                    {formatPercentage(comparison.percentage_change!)} vs. periodo
                                    anterior
                                </span>
                            </>
                        )}
                    </div>
                </article>
                <article className="min-w-0 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3 sm:p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#65738A]">
                        <UsersRound
                            className="size-3.5 shrink-0 text-[#2451C5]"
                            aria-hidden="true"
                        />
                        <span>Visitantes únicos estimados</span>
                    </div>
                    <p className="mt-1 font-display text-2xl tracking-[-.05em] text-[#12234A]">
                        {formatCount(stats.unique_visitors_estimated)}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#7A879A]">
                        Estimación anónima
                    </p>
                </article>
            </div>

            <div className="mt-4 rounded-xl border border-[#E7ECF4] bg-white p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div>
                        <h3 className="text-xs font-semibold text-[#243556]">
                            Visitas por {chartUnit}
                        </h3>
                        <p className="mt-0.5 text-[10px] text-[#7A879A]">
                            Zona horaria: {stats.meta.timezone}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-[#65738A]">
                        <span className="inline-flex items-center gap-1.5">
                            <i className="size-2 rounded-full bg-[#34714B]" aria-hidden="true" />
                            Este periodo
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <i className="size-2 rounded-full bg-[#AAB5C6]" aria-hidden="true" />
                            Periodo anterior
                        </span>
                    </div>
                </div>
                {noVisits ? (
                    <div className="grid h-[170px] place-items-center text-center">
                        <div>
                            <p className="text-sm font-medium text-[#53627A]">Aún no hay visitas</p>
                            <p className="mt-1 text-xs text-[#8792A3]">
                                El resumen aparecerá aquí cuando alguien visite tu tienda.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="mt-3 h-[170px] w-full"
                        role="img"
                        aria-label={`Gráfica de visitas por ${chartUnit} comparadas con el periodo anterior`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={intervals}
                                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                            >
                                <CartesianGrid vertical={false} stroke="#E9EEF5" />
                                <XAxis
                                    dataKey="label"
                                    tickFormatter={(label: string) =>
                                        formatSeriesLabel(label, stats.series.granularity, true)
                                    }
                                    tick={{ fill: '#8792A3', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={16}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: '#8792A3', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                />
                                <Tooltip
                                    content={
                                        <VisitsTooltip granularity={stats.series.granularity} />
                                    }
                                />
                                <Line
                                    type="monotone"
                                    dataKey="currentVisits"
                                    name="Este periodo"
                                    stroke="#34714B"
                                    strokeWidth={2.5}
                                    dot={{ r: 2.5, fill: '#34714B', strokeWidth: 0 }}
                                    activeDot={{ r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="previousVisits"
                                    name="Periodo anterior"
                                    stroke="#AAB5C6"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={{ r: 2, fill: '#AAB5C6', strokeWidth: 0 }}
                                    activeDot={{ r: 3.5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[#7A879A]">
                Las visitas no equivalen a pedidos. Los visitantes únicos son estimaciones.
            </p>
        </div>
    )
}

function VisitsTooltip({
    active,
    payload,
    granularity,
}: {
    active?: boolean
    payload?: Array<{ payload?: ChartInterval }>
    granularity: StoreVisitSeriesGranularity
}) {
    if (!active || !payload?.length) return null
    const interval = payload[0]?.payload
    if (!interval) return null

    return (
        <div className="rounded-lg border border-[#DCE5F3] bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-semibold text-[#243556]">
                {formatSeriesLabel(interval.label, granularity, false)}
            </p>
            <p className="mt-1 text-[11px] text-[#34714B]">
                Este periodo: {formatCount(interval.currentVisits)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#65738A]">
                Periodo anterior
                {interval.previousLabel
                    ? ` · ${formatSeriesLabel(interval.previousLabel, granularity, false)}`
                    : ''}
                : {formatCount(interval.previousVisits)}
            </p>
        </div>
    )
}

function buildChartIntervals(
    current: StoreVisitSeriesPoint[],
    previous: StoreVisitSeriesPoint[],
): ChartInterval[] {
    const length = Math.max(current.length, previous.length)
    return Array.from({ length }, (_, index) => ({
        label: current[index]?.label ?? previous[index]?.label ?? '',
        previousLabel: previous[index]?.label ?? null,
        currentVisits: current[index]?.visits ?? 0,
        previousVisits: previous[index]?.visits ?? 0,
    }))
}

function formatSeriesLabel(
    label: string,
    granularity: StoreVisitSeriesGranularity,
    compact: boolean,
) {
    if (granularity === 'hour') return label
    if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label

    const [year, month, day] = label.split('-').map(Number)
    // These are calendar labels in the business timezone. UTC prevents shifting the date
    // when the dashboard is opened in a different timezone.
    const value = new Date(Date.UTC(year, month - 1, day, 12))
    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        ...(compact ? {} : { weekday: 'long', month: 'long', year: 'numeric' }),
        ...(compact ? { month: 'short' } : {}),
        timeZone: 'UTC',
    }).format(value)
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

function formatPercentage(value: number) {
    return `${new Intl.NumberFormat('es-MX', {
        maximumFractionDigits: 1,
        signDisplay: 'always',
    }).format(value)}%`
}
