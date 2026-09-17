'use client'

import Link from 'next/link'
import { ArrowUpRight, Lightbulb } from 'lucide-react'
import type { Insight } from '../dashboard-data/dashboardData.types'

export function InsightsCard({ data }: { data: Insight[] }) {
    return <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">Una ayudita</p><h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">Cómo va tu negocio</h2></div><Link href="/dashboard/insights" aria-label="Ver insights" className="text-[#8996A9] hover:text-[#2451C5]"><ArrowUpRight className="size-4" /></Link></div><div className="space-y-3">{data.map((insight) => <div key={insight.label} className="flex gap-3 rounded-xl bg-[#F8FAFE] p-3.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]"><Lightbulb className="size-4" /></span><div><p className="text-sm font-semibold text-[#243556]">{insight.label}: {insight.value}</p><p className="mt-0.5 text-xs text-[#65738A]">{insight.detail}</p></div></div>)}</div></section>
}
