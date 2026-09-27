'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DateRangeFilter } from '../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../features/dashboard-filters/useDateRangeFilter'
import { useDashboardInsights } from '../features/dashboard-insights/useDashboardInsights'
import { InsightsCard } from '../features/dashboard-insights/InsightsCard'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { InsightsSkeleton } from '../components/DashboardSkeletons'

export default function InsightsPage() {
    const { range, setRange } = useDateRangeFilter()
    const insights = useDashboardInsights(range)
    if (insights.isLoading) return <InsightsSkeleton />
    if (insights.isError || !insights.data) {
        return (
            <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:py-14">
                <DashboardErrorState
                    title="No pudimos cargar tus insights"
                    description="No logramos preparar las recomendaciones para este periodo. Inténtalo nuevamente."
                    onRetry={() => void insights.refetch()}
                />
            </main>
        )
    }
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
                    <p className="text-sm text-[#65738A]">Ideas sencillas para seguir avanzando</p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                        Cómo va tu negocio
                    </h1>
                </div>
                <DateRangeFilter value={range} onChange={setRange} />
            </header>
            <div className="max-w-[620px]">
                <InsightsCard data={insights.data} />
            </div>
        </main>
    )
}
