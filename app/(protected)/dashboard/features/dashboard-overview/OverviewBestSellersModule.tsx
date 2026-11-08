'use client'

import { BestSellersCard } from '../dashboard-products/BestSellersCard'
import { DashboardCardError } from '../../components/DashboardCardError'
import { useBestSellingProducts } from '../dashboard-products/useProductAdmin'
import type { ProductPerformance } from '../dashboard-data/dashboardData.types'

function toProductPerformance(rankings: Array<{ productName: string; orderCount: number }>): ProductPerformance {
    return { totalActive: 0, bestSellers: rankings.map((product) => ({ name: product.productName, orders: product.orderCount })) }
}

export default function OverviewBestSellersModule() {
    const bestSelling = useBestSellingProducts({ limit: 4 })
    if (bestSelling.isPending)
        return <BestSellersSkeleton />
    if (bestSelling.isError)
        return <div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><DashboardCardError title="Productos más vendidos no disponibles" description="No pudimos cargar este análisis." onRetry={() => void bestSelling.refetch()} /></div>
    return <BestSellersCard data={toProductPerformance(bestSelling.data ?? [])} />
}

function BestSellersSkeleton() {
    return (
        <section className="min-h-64 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6" role="status" aria-label="Cargando productos más vendidos">
            <div className="h-3 w-28 rounded bg-[#E8EEF6]" />
            <div className="mt-3 h-6 w-48 rounded bg-[#E8EEF6]" />
            <div className="mt-6 space-y-3">
                {[1, 2, 3, 4].map((item) => <div key={item} className="flex items-center gap-3"><div className="size-10 rounded-xl bg-[#EEF2F7]" /><div className="min-w-0 flex-1"><div className="h-3 w-3/4 rounded bg-[#E8EEF6]" /><div className="mt-2 h-2.5 w-1/2 rounded bg-[#F1F4F9]" /></div><div className="h-4 w-10 rounded bg-[#E8EEF6]" /></div>)}
            </div>
        </section>
    )
}
