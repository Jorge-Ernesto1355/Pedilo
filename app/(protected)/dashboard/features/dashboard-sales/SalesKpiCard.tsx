'use client'

import Link from 'next/link'
import { ArrowUpRight, CircleDollarSign } from 'lucide-react'
import type { SalesData } from '../dashboard-data/dashboardData.types'

const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
})

export function SalesKpiCard({ data }: { data: SalesData }) {
    const trendPrefix = data.trend > 0 ? '+' : ''
    const trendColor =
        data.trend > 0 ? 'text-[#23814C]' : data.trend < 0 ? 'text-[#B54747]' : 'text-[#65738A]'

    return (
        <Link
            href="/dashboard/sales"
            className="group block rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:shadow-[0_12px_28px_rgb(20_48_105_/_0.09)]"
        >
            <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                    <CircleDollarSign className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-[#8996A9] transition group-hover:text-[#2451C5]" />
            </div>
            <p className="mt-6 text-sm text-[#65738A]">Ventas</p>
            <p className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]">
                {money.format(data.total)}
            </p>
            <p className={`mt-2 text-xs font-semibold ${trendColor}`}>
                {trendPrefix}
                {data.trend}%{' '}
                <span className="font-normal text-[#8996A9]">vs. periodo anterior</span>
            </p>
        </Link>
    )
}
