'use client'

import Link from 'next/link'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'
import type { OrdersData } from '../dashboard-data/dashboardData.types'

export function OrdersKpiCard({ data }: { data: OrdersData }) {
    return <Link href="/dashboard/orders" className="group block rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:shadow-[0_12px_28px_rgb(20_48_105_/_0.09)]"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#EEF8F2] text-[#23814C]"><ShoppingBag className="size-5" /></span><ArrowUpRight className="size-4 text-[#8996A9] transition group-hover:text-[#2451C5]" /></div><p className="mt-6 text-sm text-[#65738A]">Pedidos</p><p className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]">{data.total}</p><p className="mt-2 text-xs text-[#8996A9]">en este periodo</p></Link>
}
