'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DateRangeFilter } from '../features/dashboard-filters/DateRangeFilter'
import { useDateRangeFilter } from '../features/dashboard-filters/useDateRangeFilter'
import { useOrdersData } from '../features/dashboard-orders/useOrdersData'
import { RecentOrdersTable } from '../features/dashboard-orders/RecentOrdersTable'

export default function OrdersPage() {
    const { range, setRange } = useDateRangeFilter()
    const { data } = useOrdersData(range)
    if (!data) return <main className="px-5 py-10 text-sm text-[#65738A]">Cargando pedidos…</main>
    return <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#2451C5] hover:text-[#1E40AF]"><ArrowLeft className="size-4" />Volver al resumen</Link><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm text-[#65738A]">Todo en un solo lugar</p><h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">Pedidos</h1></div><DateRangeFilter value={range} onChange={setRange} /></header><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]"><p className="text-sm text-[#65738A]">Pedidos en el periodo</p><p className="mt-2 font-display text-3xl text-[#12234A]">{data.total}</p></div><div className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]"><p className="text-sm text-[#65738A]">Completados</p><p className="mt-2 font-display text-3xl text-[#12234A]">{data.recent.filter((order) => order.status === 'completed').length}</p></div></div><RecentOrdersTable data={data} /></main>
}
