'use client'

import Link from 'next/link'
import { Package, Receipt } from 'lucide-react'
import { useDateRangeFilter } from '../dashboard-filters/useDateRangeFilter'
import { DateRangeFilter } from '../dashboard-filters/DateRangeFilter'
import { useSalesData } from '../dashboard-sales/useSalesData'
import { SalesChart } from '../dashboard-sales/SalesChart'
import { SalesKpiCard } from '../dashboard-sales/SalesKpiCard'
import { useOrdersData } from '../dashboard-orders/useOrdersData'
import { OrdersKpiCard } from '../dashboard-orders/OrdersKpiCard'
import { RecentOrdersTable } from '../dashboard-orders/RecentOrdersTable'
import { useProductPerformance } from '../dashboard-products/useProductPerformance'
import { BestSellersCard } from '../dashboard-products/BestSellersCard'
import { useDashboardInsights } from '../dashboard-insights/useDashboardInsights'
import { InsightsCard } from '../dashboard-insights/InsightsCard'
import { SummaryKpiCard } from './SummaryKpiCard'

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export function DashboardOverview() {
    const { range, setRange } = useDateRangeFilter()
    const sales = useSalesData(range)
    const orders = useOrdersData(range)
    const products = useProductPerformance(range)
    const insights = useDashboardInsights(range)

    if (!sales.data || !orders.data || !products.data || !insights.data) return <DashboardLoading />

    return <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-[#65738A]">Aquí tienes el resumen de tu negocio</p><h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A] sm:text-4xl">Buenos días, Jorge 👋</h1></div><DateRangeFilter value={range} onChange={setRange} /></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del negocio"><SalesKpiCard data={sales.data} /><OrdersKpiCard data={orders.data} /><SummaryKpiCard label="Productos" value={String(products.data.totalActive)} helper="activos en tu menú" href="/dashboard/products" icon={Package} tone="blue" /><SummaryKpiCard label="Ticket promedio" value={money.format(sales.data.averageTicket)} helper="por pedido" href="/dashboard/sales" icon={Receipt} tone="orange" /></section><section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><div className="mb-1 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">Ventas</p><h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">Cómo te fue</h2></div><Link href="/dashboard/sales" className="text-xs font-semibold text-[#2451C5] hover:text-[#1E40AF]">Ver detalle</Link></div><SalesChart data={sales.data} /></section><section className="grid gap-4 lg:grid-cols-2"><BestSellersCard data={products.data} /><InsightsCard data={insights.data} /></section><RecentOrdersTable data={orders.data} /></main>
}

function DashboardLoading() {
    return <main className="mx-auto max-w-[1440px] px-5 py-10 text-sm text-[#65738A]">Cargando el resumen…</main>
}
