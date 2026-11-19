'use client'

import { lazy, Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DateRangeFilter } from '../../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../../features/dashboard-filters/useDateRangeFilter'
import { useSalesData } from '../../features/dashboard-sales/useSalesData'
import { SalesKpiCard } from '../../features/dashboard-sales/SalesKpiCard'
import { AverageTicketKpiCard } from '../../features/dashboard-sales/AverageTicketKpiCard'
import { useAverageTicketData } from '../../features/dashboard-sales/useAverageTicketData'
import { TrendKpiCard } from '../../features/dashboard-sales/TrendKpiCard'
import { useTrendData } from '../../features/dashboard-sales/useTrendData'
import { useHistoricalSalesData } from '../../features/dashboard-sales/useHistoricalSalesData'
import { SalesPointsTable } from '../../features/dashboard-sales/SalesPointsTable'
import { OrdersKpiCard } from '../../features/dashboard-orders/OrdersKpiCard'
import { DashboardCardError } from '../../components/DashboardCardError'
import { SalesAccountingNotice } from '../../features/dashboard-sales/SalesAccountingNotice'
import { useSeedServerKpis } from '../../features/dashboard-overview/useSeedServerKpis'
import type { OverviewInitialData } from '../../features/dashboard-overview/getOverviewInitialData'
import type { DateRange } from '../../features/dashboard-data/dashboardData.types'

// recharts se descarga aparte: ganancias, ticket e históricas (normalmente ya en caché
// desde el resumen) se pintan sin esperar a la librería de gráficas.
const LazySalesChart = lazy(() =>
    import('../../features/dashboard-sales/SalesChart').then((module) => ({
        default: module.SalesChart,
    })),
)

const currency = 'MXN'

export function SalesPageClient({ initialData }: { initialData?: Promise<OverviewInitialData> }) {
    const { range, setRange } = useDateRangeFilter('today')

    // Sin skeleton de página completa: encabezado y filtro al instante, y cada sección
    // muestra lo que ya tiene (caché o servidor) o su propio estado de carga.
    return (
        <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-[#2451C5] hover:text-[#1E40AF]"
            >
                <ArrowLeft className="size-4" />
                Volver al resumen
            </Link>
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-[#65738A]">Tus números, sin vueltas</p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                        Ventas
                    </h1>
                </div>
                <DateRangeFilter value={range} onChange={setRange} />
            </header>
            <Suspense fallback={<SalesSectionsFallback />}>
                <SalesSections range={range} initialData={initialData} />
            </Suspense>
        </main>
    )
}

function SalesSections({
    range,
    initialData,
}: {
    range: DateRange
    initialData?: Promise<OverviewInitialData>
}) {
    useSeedServerKpis(range, initialData)
    const sales = useSalesData(range)
    const trend = useTrendData(range)
    const historicalSales = useHistoricalSalesData()
    const averageTicket = useAverageTicketData(range)
    // Datos del periodo anterior mientras llega el nuevo (ver keepPreviousInScope).
    const showingPreviousPeriod =
        sales.isPlaceholderData || trend.isPlaceholderData || averageTicket.isPlaceholderData

    return (
        <div
            aria-busy={showingPreviousPeriod}
            className={`space-y-6 transition-opacity duration-200 ${showingPreviousPeriod ? 'opacity-60' : ''}`}
        >
            <section className="grid gap-4 xl:grid-cols-4" aria-label="Métricas de ventas">
                <div className="xl:col-span-2">
                    <SalesKpiCard
                        data={sales.data}
                        currency={currency}
                        isLoading={sales.isLoading}
                        isError={sales.isError}
                        onRetry={() => void sales.refetch()}
                        historicalData={historicalSales.data}
                        historicalIsLoading={historicalSales.isLoading}
                        historicalIsError={historicalSales.isError}
                        historicalIsRetrying={historicalSales.isFetching}
                        onHistoricalRetry={() => void historicalSales.refetch()}
                    />
                </div>
                <TrendKpiCard
                    data={trend.data}
                    currency={currency}
                    isLoading={trend.isLoading}
                    isError={trend.isError}
                    isRetrying={trend.isFetching}
                    onRetry={() => void trend.refetch()}
                />
                <AverageTicketKpiCard
                    data={averageTicket.data?.data}
                    currency={averageTicket.data?.data.currency || currency}
                    isLoading={averageTicket.isLoading}
                    isError={averageTicket.isError}
                    onRetry={() => void averageTicket.refetch()}
                />
            </section>
            <section aria-label="Indicadores secundarios">
                <OrdersKpiCard
                    data={{ total: sales.data?.ordersCount ?? 0, recent: [] }}
                    compact
                    isLoading={sales.isLoading}
                    isError={sales.isError}
                    onRetry={() => void sales.refetch()}
                />
            </section>
            {trend.data ? (
                <section className="relative rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                    <h2 className="font-display text-lg text-[#12234A]">Ventas por periodo</h2>
                    <p className="mt-1 text-sm text-[#65738A]">Mira cómo se mueven tus ventas.</p>
                    <div className="relative mt-5">
                        <Suspense fallback={<ChartPlaceholder />}>
                            <LazySalesChart data={trend.data} currency={currency} />
                        </Suspense>
                    </div>
                    <div className="mt-5">
                        <SalesAccountingNotice />
                    </div>
                    <SalesPointsTable data={trend.data} currency={currency} />
                    {/* Solo al cambiar de periodo: un refresco en segundo plano no tapa los
                        datos que ya se pueden leer. */}
                    {trend.isFetching && trend.isPlaceholderData ? (
                        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 text-sm text-[#65738A]">
                            Actualizando ventas…
                        </div>
                    ) : null}
                </section>
            ) : trend.isError ? (
                <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                    <h2 className="font-display text-lg text-[#12234A]">Ventas por periodo</h2>
                    <DashboardCardError
                        title="Gráfica de ventas no disponible"
                        description="No pudimos cargar los datos de este periodo."
                        onRetry={() => void trend.refetch()}
                    />
                </section>
            ) : (
                <SalesByPeriodLoading />
            )}
        </div>
    )
}

function ChartPlaceholder() {
    return (
        <div
            className="h-[260px] w-full animate-pulse rounded-xl bg-[#F3F6FA]"
            aria-hidden="true"
        />
    )
}

function SalesByPeriodLoading() {
    return (
        <section
            aria-busy="true"
            aria-label="Cargando ventas por periodo"
            className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"
        >
            <h2 className="font-display text-lg text-[#12234A]">Ventas por periodo</h2>
            <p className="mt-1 text-sm text-[#65738A]">Mira cómo se mueven tus ventas.</p>
            <div className="mt-5">
                <ChartPlaceholder />
            </div>
            <div className="mt-5">
                <SalesAccountingNotice />
            </div>
            <div className="mt-6 space-y-3 border-t border-[#EDF2F9] pt-5" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <span className="h-4 w-32 animate-pulse rounded bg-[#EEF2F7]" />
                        <span className="h-4 w-24 animate-pulse rounded bg-[#EEF2F7]" />
                    </div>
                ))}
            </div>
        </section>
    )
}

function SalesSectionsFallback() {
    return (
        <div className="space-y-6">
            <section
                className="grid gap-4 xl:grid-cols-4"
                aria-label="Métricas de ventas"
                aria-busy="true"
            >
                <div className="xl:col-span-2">
                    <SalesKpiCard isLoading historicalIsLoading />
                </div>
                <TrendKpiCard isLoading />
                <AverageTicketKpiCard isLoading />
            </section>
            <section aria-label="Indicadores secundarios">
                <OrdersKpiCard data={{ total: 0, recent: [] }} compact isLoading />
            </section>
            <SalesByPeriodLoading />
        </div>
    )
}
