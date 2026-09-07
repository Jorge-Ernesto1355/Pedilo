'use client'

import Link from 'next/link'
import { ArrowUpRight, Trophy } from 'lucide-react'
import type { ProductPerformance } from '../dashboard-data/dashboardData.types'

export function BestSellersCard({ data }: { data: ProductPerformance }) {
    return <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#A46B00]">Catálogo</p><h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">Lo más vendido</h2></div><Link href="/dashboard/products" aria-label="Ver productos" className="text-[#8996A9] hover:text-[#2451C5]"><ArrowUpRight className="size-4" /></Link></div><div className="space-y-3.5">{data.bestSellers.map((product, index) => <div key={product.name} className="flex items-center gap-3"><span className={`grid size-8 place-items-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-[#FFF6DF] text-[#A46B00]' : 'bg-[#F5F8FC] text-[#8996A9]'}`}>{index === 0 ? <Trophy className="size-3.5" /> : index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-[#243556]">{product.name}</span><span className="text-xs text-[#8996A9]">{product.orders} pedidos</span></div>)}</div></section>
}
