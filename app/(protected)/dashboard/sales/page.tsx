'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DateRangeFilter } from '../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../features/dashboard-filters/useDateRangeFilter'
import { useSalesData } from '../features/dashboard-sales/useSalesData'
import { SalesChart } from '../features/dashboard-sales/SalesChart'
import { SalesKpiCard } from '../features/dashboard-sales/SalesKpiCard'

export default function SalesPage() {
    const { range, setRange } = useDateRangeFilter()
    const { data } = useSalesData(range)
    if (!data) return <DetailLoading />
    return <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#2451C5] hover:text-[#1E40AF]"><ArrowLeft className="size-4" />Volver al resumen</Link><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm text-[#65738A]">Tus números, sin vueltas</p><h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">Ventas</h1></div><DateRangeFilter value={range} onChange={setRange} /></header><SalesKpiCard data={data} /><section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><h2 className="font-display text-lg text-[#12234A]">Ventas por periodo</h2><p className="mt-1 text-sm text-[#65738A]">Mira cómo se mueven tus ventas.</p><div className="mt-5"><SalesChart data={data} /></div></section></main>
}

function DetailLoading() { return <main className="px-5 py-10 text-sm text-[#65738A]">Cargando ventas…</main> }
