'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DateRangeFilter } from '../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../features/dashboard-filters/useDateRangeFilter'
import { useSalesData } from '../features/dashboard-sales/useSalesData'
import { SalesChart } from '../features/dashboard-sales/SalesChart'
import { SalesKpiCard } from '../features/dashboard-sales/SalesKpiCard'
import { SalesPointsTable } from '../features/dashboard-sales/SalesPointsTable'
import { OrdersKpiCard } from '../features/dashboard-orders/OrdersKpiCard'
import { SummaryKpiCard } from '../features/dashboard-overview/SummaryKpiCard'
import { Receipt, TrendingUp } from 'lucide-react'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { SalesSkeleton } from '../components/DashboardSkeletons'
import { useBusinessSettings } from '../../create-menu/features/business-settings/useBusinessSettings'
import { formatMoney } from '../features/dashboard-data/formatters'
import { SalesAccountingNotice } from '../features/dashboard-sales/SalesAccountingNotice'

export default function SalesPage() {
    const { range, setRange } = useDateRangeFilter('today')
    const sales = useSalesData(range)
    const settings = useBusinessSettings(true)
    const currency = settings.settings.data?.currency ?? 'MXN'

    if (sales.isLoading) return <SalesSkeleton />

    return (
        <main
            className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"
            aria-busy={sales.isFetching}
        >
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
            {sales.isError ? (
                <DashboardErrorState
                    title="No pudimos cargar tus ventas"
                    description="No logramos obtener los datos de este periodo. Revisa tu conexión e inténtalo nuevamente."
                    onRetry={() => void sales.refetch()}
                />
            ) : sales.data ? (
                <>
                    <section
                        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                        aria-label="Métricas de ventas"
                    >
                        <SalesKpiCard data={sales.data} currency={currency} />
                        <OrdersKpiCard data={{ total: sales.data.ordersCount, recent: [] }} />
                        <SummaryKpiCard
                            label="Ticket promedio"
                            value={formatMoney(sales.data.averageTicket, currency)}
                            helper="por pedido"
                            href="/dashboard/sales"
                            icon={Receipt}
                            tone="orange"
                        />
                        <SummaryKpiCard
                            label="Tendencia"
                            value={`${sales.data.trend > 0 ? '+' : ''}${sales.data.trend}%`}
                            helper="vs. periodo anterior"
                            href="/dashboard/sales"
                            icon={TrendingUp}
                            tone={
                                sales.data.trend > 0
                                    ? 'green'
                                    : sales.data.trend < 0
                                      ? 'red'
                                      : 'blue'
                            }
                        />
                    </section>
                    <section className="relative rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                        <h2 className="font-display text-lg text-[#12234A]">Ventas por periodo</h2>
                        <p className="mt-1 text-sm text-[#65738A]">
                            Mira cómo se mueven tus ventas.
                        </p>
                        <div className="relative mt-5">
                            <SalesChart data={sales.data} currency={currency} />
                            {sales.data.points.every(
                                (point) => point.sales === 0 && point.orderCount === 0,
                            ) ? (
                                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                                    <div className="pointer-events-auto rounded-xl border border-[#DCE5F3] bg-white/95 px-4 py-3 text-center shadow-sm">
                                        <p className="text-sm font-semibold text-[#243556]">
                                            Aún no hay ventas en este periodo.
                                        </p>
                                        <p className="mt-1 text-xs text-[#65738A]">
                                            Cuando recibas pedidos, aparecerán aquí.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-5">
                            <SalesAccountingNotice />
                        </div>
                        <SalesPointsTable data={sales.data} currency={currency} />
                        {sales.isFetching ? (
                            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 text-sm text-[#65738A]">
                                Actualizando ventas…
                            </div>
                        ) : null}
                    </section>
                </>
            ) : null}
        </main>
    )
}
