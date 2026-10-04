'use client'

import Link from 'next/link'
import { Package, Receipt } from 'lucide-react'
import { useDateRangeFilter } from '../dashboard-filters/useDateRangeFilter'
import { DateRangeFilter } from '../dashboard-filters/DateRangeFilter'
import { useSalesData } from '../dashboard-sales/useSalesData'
import { SalesChart } from '../dashboard-sales/SalesChart'
import { SalesKpiCard } from '../dashboard-sales/SalesKpiCard'
import { OrdersKpiCard } from '../dashboard-orders/OrdersKpiCard'
import { RecentOrdersTable } from '../dashboard-orders/RecentOrdersTable'
import { BestSellersCard } from '../dashboard-products/BestSellersCard'
import { InsightsCard } from '../dashboard-insights/InsightsCard'
import { SummaryKpiCard } from './SummaryKpiCard'
import { useOrders } from '../orders/useOrders'
import { useProductAnalytics, useProductStats } from '../dashboard-products/useProductAdmin'
import type { OrderStatus } from '@/src/lib/api/order-types'
import type { OrdersData, ProductPerformance } from '../dashboard-data/dashboardData.types'
import { DashboardErrorState } from '../../components/DashboardErrorState'
import { OverviewSkeleton } from '../../components/DashboardSkeletons'
import { useBusinessSettings } from '@/app/(protected)/create-menu/features/business-settings/useBusinessSettings'
import { formatMoney } from '../dashboard-data/formatters'

export function DashboardOverview() {
    const { range, setRange } = useDateRangeFilter()
    const sales = useSalesData(range)
    const orders = useOrders({ page: 1, limit: 5 })
    const productStats = useProductStats()
    const productAnalytics = useProductAnalytics({ limit: 4 })
    const settings = useBusinessSettings(true)
    const currency = settings.settings.data?.currency ?? 'MXN'

    const loading =
        sales.isLoading ||
        orders.isLoading ||
        productStats.isLoading ||
        productAnalytics.bestSelling.isLoading
    const error =
        sales.isError ||
        orders.isError ||
        productStats.isError ||
        productAnalytics.bestSelling.isError

    if (loading) return <OverviewSkeleton />
    if (
        error ||
        !sales.data ||
        !orders.data ||
        !productStats.data ||
        !productAnalytics.bestSelling.data
    ) {
        const retry = async () => {
            await Promise.all([
                sales.refetch(),
                orders.refetch(),
                productStats.refetch(),
                productAnalytics.bestSelling.refetch(),
            ])
        }

        return (
            <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
                <DashboardErrorState
                    title="No pudimos cargar tu resumen"
                    description="Ocurrió un problema al consultar tus ventas, pedidos o productos. Puedes intentar cargar la información nuevamente."
                    onRetry={() => void retry()}
                />
            </main>
        )
    }

    const products = toProductPerformance(
        productStats.data.activeProducts,
        productAnalytics.bestSelling.data,
    )
    const recentOrders = toOrdersData(orders.data.orders)
    const insights = [
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

    return (
        <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-medium text-[#65738A]">
                        Aquí tienes el resumen de tu negocio
                    </p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A] sm:text-4xl">
                        Buenos días, Jorge 👋
                    </h1>
                </div>
                <DateRangeFilter value={range} onChange={setRange} />
            </header>
            <section
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                aria-label="Resumen del negocio"
            >
                <SalesKpiCard data={sales.data} currency={currency} />
                <OrdersKpiCard data={{ total: sales.data.ordersCount, recent: [] }} />
                <SummaryKpiCard
                    label="Productos"
                    value={String(products.totalActive)}
                    helper="activos en tu menú"
                    href="/dashboard/products"
                    icon={Package}
                    tone="blue"
                />
                <SummaryKpiCard
                    label="Ticket promedio"
                    value={formatMoney(sales.data.averageTicket, currency)}
                    helper="por pedido"
                    href="/dashboard/sales"
                    icon={Receipt}
                    tone="orange"
                />
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
                <SalesChart data={sales.data} currency={currency} />
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
                <BestSellersCard data={products} />
                <InsightsCard data={insights} />
            </section>
            <RecentOrdersTable data={recentOrders} />
        </main>
    )
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
        customerName: string
        total: number
        status: OrderStatus
    }>,
): OrdersData {
    return {
        total: orders.length,
        recent: orders.map((order) => ({
            id: `#${order.orderNumber}`,
            customer: order.customerName,
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
