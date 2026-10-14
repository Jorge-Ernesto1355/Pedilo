'use client'

import Link from 'next/link'
import { CalendarDays, Package } from 'lucide-react'
import { useDateRangeFilter } from '../dashboard-filters/useDateRangeFilter'
import { DateRangeFilter } from '../dashboard-filters/DateRangeFilter'
import { useSalesData } from '../dashboard-sales/useSalesData'
import { SalesChart } from '../dashboard-sales/SalesChart'
import { SalesKpiCard } from '../dashboard-sales/SalesKpiCard'
import { AverageTicketKpiCard } from '../dashboard-sales/AverageTicketKpiCard'
import { useAverageTicketData } from '../dashboard-sales/useAverageTicketData'
import { OrdersKpiCard } from '../dashboard-orders/OrdersKpiCard'
import { RecentOrdersTable } from '../dashboard-orders/RecentOrdersTable'
import { BestSellersCard } from '../dashboard-products/BestSellersCard'
import { InsightsCard } from '../dashboard-insights/InsightsCard'
import { SummaryKpiCard } from './SummaryKpiCard'
import { useOrders } from '../orders/useOrders'
import { useProductAnalytics, useProductStats } from '../dashboard-products/useProductAdmin'
import type { OrderStatus } from '@/src/lib/api/order-types'
import type { OrdersData, ProductPerformance } from '../dashboard-data/dashboardData.types'
import { DashboardCardError } from '../../components/DashboardCardError'
import { OverviewSkeleton } from '../../components/DashboardSkeletons'
import { useBusinessSettings } from '@/app/(protected)/create-menu/features/business-settings/useBusinessSettings'
import { SalesAccountingNotice } from '../dashboard-sales/SalesAccountingNotice'

export function DashboardOverview() {
    const { range, setRange } = useDateRangeFilter()
    const sales = useSalesData(range)
    const averageTicket = useAverageTicketData(range)

    const orders = useOrders({ page: 1, limit: 5 })
    const productStats = useProductStats()
    const productAnalytics = useProductAnalytics({ limit: 4 })
    const settings = useBusinessSettings(true)
    const currency = settings.settings.data?.currency ?? 'MXN'

    const loading =
        orders.isLoading || productStats.isLoading || productAnalytics.bestSelling.isLoading
    if (loading) return <OverviewSkeleton />
    const products = toProductPerformance(
        productStats.data?.activeProducts ?? 0,
        productAnalytics.bestSelling.data ?? [],
    )
    const recentOrders = toOrdersData(orders.data?.orders ?? [])
    const insights = sales.data
        ? [
              {
                  label: 'Tendencia',
                  value: `${sales.data.trend > 0 ? '+' : ''}${sales.data.trend}%`,
                  detail: 'comparado con el periodo anterior',
              },
              {
                  label: 'Órdenes',
                  value: String(sales.data.ordersCount),
                  detail: 'en el periodo seleccionado',
              },
          ]
        : [
              {
                  label: 'Tendencia',
                  value: 'No disponible',
                  detail: 'No se pudo cargar este indicador',
              },
          ]

    return (
        <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <header className="flex flex-col justify-between gap-5 border-b border-[#DCE5F3] pb-6 sm:flex-row sm:items-end">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-[#65738A]">
                        <CalendarDays className="size-4 text-[#2451C5]" aria-hidden="true" />
                        <time dateTime={new Date().toISOString()}>{formatToday()}</time>
                    </div>
                    <h1 className="mt-2 font-display text-4xl tracking-[-.06em] text-[#12234A] sm:text-5xl">
                        Ganancias
                    </h1>
                    <p className="mt-2 text-sm text-[#65738A]">
                        Revisa cuánto vendiste y cómo va tu negocio.
                    </p>
                </div>
                <DateRangeFilter value={range} onChange={setRange} />
            </header>
            <section
                className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"
                aria-label="Resumen del negocio"
            >
                <SalesKpiCard
                    data={sales.data}
                    currency={currency}
                    isLoading={sales.isLoading}
                    isError={sales.isError}
                    onRetry={() => void sales.refetch()}
                />
                <AverageTicketKpiCard
                    data={averageTicket.data?.data}
                    currency={averageTicket.data?.data.currency || currency}
                    isLoading={averageTicket.isLoading}
                    isError={averageTicket.isError}
                    onRetry={() => void averageTicket.refetch()}
                />
            </section>
            <section
                className="flex flex-col gap-4 sm:flex-row"
                aria-label="Indicadores secundarios"
            >
                <div className="min-w-0 flex-1">
                    <OrdersKpiCard
                        data={{
                            total: sales.data?.ordersCount ?? orders.data?.total ?? 0,
                            recent: [],
                        }}
                        compact
                        isLoading={orders.isLoading}
                        isError={orders.isError}
                        onRetry={() => void orders.refetch()}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <SummaryKpiCard
                        label="Productos"
                        value={String(products.totalActive)}
                        helper="activos en tu menú"
                        href="/dashboard/products"
                        icon={Package}
                        tone="blue"
                        compact
                        isLoading={productStats.isLoading}
                        isError={productStats.isError}
                        onRetry={() => void productStats.refetch()}
                    />
                </div>
            </section>
            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                <div className="mb-1 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">
                            Ventas
                        </p>
                        <h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">
                            Cómo te fue
                        </h2>
                    </div>
                    <Link
                        href="/dashboard/sales"
                        className="text-xs font-semibold text-[#2451C5] hover:text-[#1E40AF]"
                    >
                        Ver detalle
                    </Link>
                </div>
                {sales.data ? (
                    <SalesChart data={sales.data} currency={currency} />
                ) : (
                    <DashboardCardError
                        title="Ventas no disponibles"
                        description="No pudimos cargar la gráfica de este periodo."
                        onRetry={() => void sales.refetch()}
                    />
                )}
                <div className="mt-5">
                    <SalesAccountingNotice />
                </div>
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
                {productAnalytics.bestSelling.isError ? (
                    <div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                        <DashboardCardError
                            title="Productos más vendidos no disponibles"
                            description="No pudimos cargar este análisis."
                            onRetry={() => void productAnalytics.bestSelling.refetch()}
                        />
                    </div>
                ) : (
                    <BestSellersCard data={products} />
                )}
                <InsightsCard data={insights} />
            </section>
            {orders.isError ? (
                <DashboardCardError
                    title="Pedidos recientes no disponibles"
                    description="No pudimos cargar los pedidos recientes."
                    onRetry={() => void orders.refetch()}
                />
            ) : (
                <RecentOrdersTable data={recentOrders} />
            )}
        </main>
    )
}

function formatToday() {
    return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Mazatlan',
    }).format(new Date())
}

function toProductPerformance(
    activeProducts: number,
    rankings: Array<{ productName: string; orderCount: number }>,
): ProductPerformance {
    return {
        totalActive: activeProducts,
        bestSellers: rankings.map((product) => ({
            name: product.productName,
            orders: product.orderCount,
        })),
    }
}

function toOrdersData(
    orders: Array<{
        id: string
        orderNumber: number
        customerName: string | null
        total: number
        status: OrderStatus
    }>,
): OrdersData {
    return {
        total: orders.length,
        recent: orders.map((order) => ({
            id: `#${order.orderNumber}`,
            customer: order.customerName ?? 'Cliente sin nombre',
            amount: order.total,
            status:
                order.status === 'READY'
                    ? 'ready'
                    : order.status === 'CANCELLED'
                      ? 'cancelled'
                      : order.status === 'PENDING'
                        ? 'pending'
                        : 'preparing',
        })),
    }
}
