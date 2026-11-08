'use client'

import { lazy, useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useDateRangeFilter } from '../dashboard-filters/useDateRangeFilter'
import { DateRangeFilter } from '../dashboard-filters/DateRangeFilter'
import { useSalesData } from '../dashboard-sales/useSalesData'
import { useHistoricalSalesData } from '../dashboard-sales/useHistoricalSalesData'
import { SalesKpiCard } from '../dashboard-sales/SalesKpiCard'
import { AverageTicketKpiCard } from '../dashboard-sales/AverageTicketKpiCard'
import { useAverageTicketData } from '../dashboard-sales/useAverageTicketData'
import { GoogleReviewsStatsCard } from './GoogleReviewsStatsCard'
import { MenuVisitsCard } from './MenuVisitsCard'
import { DeferredDashboardModule, DeferredDashboardCardFallback } from './DeferredDashboardModule'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

const LazyTrendModule = lazy(() => import('./OverviewTrendModule'))
const LazyBestSellersModule = lazy(() => import('./OverviewBestSellersModule'))
const LazyRecentOrdersModule = lazy(() => import('./OverviewRecentOrdersModule'))

export function DashboardOverviewProgressive({ todayIso }: { todayIso: string }) {
    const { range, setRange } = useDateRangeFilter()
    const sales = useSalesData(range)
    const historicalSales = useHistoricalSalesData()
    const averageTicket = useAverageTicketData(range)
    const [secondaryPriorityEnabled, setSecondaryPriorityEnabled] = useState(false)
    useEffect(() => {
        // Let priority-one queries register first; do not wait for them to finish.
        const timer = window.setTimeout(() => setSecondaryPriorityEnabled(true), 0)
        return () => window.clearTimeout(timer)
    }, [])
    // The dashboard uses the default display currency and should not fetch
    // editable business settings until the settings UI is opened.
    const currency = 'MXN'

    return (
        <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <header className="flex flex-col justify-between gap-5 border-b border-[#DCE5F3] pb-6 sm:flex-row sm:items-end">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[#65738A]">
                        <CalendarDays className="size-4 text-[#2451C5]" aria-hidden="true" />
                        <time dateTime={todayIso}>{formatToday(todayIso)}</time>
                    </div>
                    <h1 className="mt-2 font-display text-4xl tracking-[-.06em] text-[#12234A] sm:text-5xl">Ganancias</h1>
                    <p className="mt-2 text-sm text-[#65738A]">Revisa tus ventas y la actividad de tu negocio.</p>
                </div>
                <DateRangeFilter value={range} onChange={setRange} label="Periodo del dashboard" />
            </header>

            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-label="Resumen del negocio">
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
                <AverageTicketKpiCard
                    data={averageTicket.data?.data}
                    currency={averageTicket.data?.data.currency || currency}
                    isLoading={averageTicket.isLoading}
                    isError={averageTicket.isError}
                    onRetry={() => void averageTicket.refetch()}
                />
            </section>

            <section className="grid min-w-0 gap-4 lg:grid-cols-2" aria-label="Actividad del menú y reseñas">
                <GoogleReviewsStatsCard period={range} enabled={secondaryPriorityEnabled} />
                <MenuVisitsCard period={range} enabled={secondaryPriorityEnabled} />
            </section>

            <DeferredDashboardModule fallback={<DeferredDashboardCardFallback className="min-h-[390px]" />}>
                <LazyTrendModule period={range as SalesPeriod} currency={currency} />
            </DeferredDashboardModule>

            <DeferredDashboardModule fallback={<DeferredDashboardCardFallback />}>
                <LazyBestSellersModule />
            </DeferredDashboardModule>

            <DeferredDashboardModule fallback={<DeferredDashboardCardFallback className="min-h-[300px]" />}>
                <LazyRecentOrdersModule />
            </DeferredDashboardModule>
        </main>
    )
}

function formatToday(todayIso: string) {
    return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Mazatlan',
    }).format(new Date(todayIso))
}
