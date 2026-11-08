'use client'

import { BestSellersCard } from '../dashboard-products/BestSellersCard'
import { DashboardCardError } from '../../components/DashboardCardError'
import { useProductAnalytics, useProductStats } from '../dashboard-products/useProductAdmin'
import type { ProductPerformance } from '../dashboard-data/dashboardData.types'

function toProductPerformance(activeProducts: number, rankings: Array<{ productName: string; orderCount: number }>): ProductPerformance {
    return { totalActive: activeProducts, bestSellers: rankings.map((product) => ({ name: product.productName, orders: product.orderCount })) }
}

export default function OverviewBestSellersModule() {
    const productStats = useProductStats()
    const productAnalytics = useProductAnalytics({ limit: 4 })
    if (productStats.isPending || productAnalytics.bestSelling.isPending)
        return <div className="min-h-64 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6" role="status" aria-label="Cargando productos más vendidos" />
    if (productStats.isError || productAnalytics.bestSelling.isError)
        return <div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><DashboardCardError title="Productos más vendidos no disponibles" description="No pudimos cargar este análisis." onRetry={() => void productAnalytics.bestSelling.refetch()} /></div>
    return <BestSellersCard data={toProductPerformance(productStats.data?.activeProducts ?? 0, productAnalytics.bestSelling.data ?? [])} />
}
