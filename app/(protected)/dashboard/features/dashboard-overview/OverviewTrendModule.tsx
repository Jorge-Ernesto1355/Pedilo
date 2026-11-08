'use client'

import Link from 'next/link'
import { useTrendData } from '../dashboard-sales/useTrendData'
import { SalesChart } from '../dashboard-sales/SalesChart'
import { SalesAccountingNotice } from '../dashboard-sales/SalesAccountingNotice'
import { DashboardCardError } from '../../components/DashboardCardError'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

export default function OverviewTrendModule({ period, currency }: { period: SalesPeriod; currency: string }) {
    const trend = useTrendData(period)
    return (
        <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
            <div className="mb-1 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">Ventas</p>
                    <h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">Cómo te fue</h2>
                </div>
                <Link href="/dashboard/sales" className="text-xs font-semibold text-[#2451C5] hover:text-[#1E40AF]">Ver detalle</Link>
            </div>
            {trend.isPending ? (
                <div className="mt-5 h-56 animate-pulse rounded-xl bg-[#F3F6FA]" role="status" aria-label="Cargando gráfica de ventas" />
            ) : trend.data ? (
                <SalesChart data={trend.data} currency={currency} />
            ) : (
                <DashboardCardError title="Ventas no disponibles" description="No pudimos cargar la gráfica de este periodo." onRetry={() => void trend.refetch()} />
            )}
            <div className="mt-5"><SalesAccountingNotice /></div>
        </section>
    )
}
