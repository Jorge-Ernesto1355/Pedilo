'use client'

import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { DateRangeFilter } from '../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../features/dashboard-filters/useDateRangeFilter'
import { useProductPerformance } from '../features/dashboard-products/useProductPerformance'
import { BestSellersCard } from '../features/dashboard-products/BestSellersCard'

export default function ProductsPage() {
    const { range, setRange } = useDateRangeFilter()
    const { data } = useProductPerformance(range)
    if (!data) return <main className="px-5 py-10 text-sm text-[#65738A]">Cargando productos…</main>
    return <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#2451C5] hover:text-[#1E40AF]"><ArrowLeft className="size-4" />Volver al resumen</Link><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm text-[#65738A]">Lo que tus clientes están eligiendo</p><h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">Productos</h1></div><DateRangeFilter value={range} onChange={setRange} /></header><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]"><span className="grid size-9 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]"><Package className="size-5" /></span><p className="mt-5 text-sm text-[#65738A]">Productos activos</p><p className="mt-1 font-display text-3xl text-[#12234A]">{data.totalActive}</p></div></div><div className="max-w-[620px]"><BestSellersCard data={data} /></div></main>
}
