'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'

type SummaryKpiCardProps = { label: string; value: string; helper: string; href: string; icon: LucideIcon; tone: 'blue' | 'orange' }

export function SummaryKpiCard({ label, value, helper, href, icon: Icon, tone }: SummaryKpiCardProps) {
    return <Link href={href} className="group block rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:shadow-[0_12px_28px_rgb(20_48_105_/_0.09)]"><div className="flex items-start justify-between"><span className={`grid size-9 place-items-center rounded-xl ${tone === 'blue' ? 'bg-[#EAF0FF] text-[#2451C5]' : 'bg-[#FFF6DF] text-[#A46B00]'}`}><Icon className="size-5" /></span><ArrowUpRight className="size-4 text-[#8996A9] transition group-hover:text-[#2451C5]" /></div><p className="mt-6 text-sm text-[#65738A]">{label}</p><p className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]">{value}</p><p className="mt-2 text-xs text-[#8996A9]">{helper}</p></Link>
}
