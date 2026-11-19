'use client'

import { BarChart3, Filter, Package, TrendingUp } from 'lucide-react'

type ProductStats = {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    uncategorizedProducts: number
    categoriesWithProducts: number
}

export function ProductStatsCards({
    stats,
    isLoading,
}: {
    stats?: ProductStats
    isLoading: boolean
}) {
    const cards = [
        { label: 'Total de productos', value: stats?.totalProducts ?? 0, icon: Package },
        { label: 'Activos', value: stats?.activeProducts ?? 0, icon: TrendingUp },
        { label: 'Inactivos', value: stats?.inactiveProducts ?? 0, icon: Filter },
        { label: 'Sin categoría', value: stats?.uncategorizedProducts ?? 0, icon: BarChart3 },
        {
            label: 'Categorías con productos',
            value: stats?.categoriesWithProducts ?? 0,
            icon: BarChart3,
        },
    ]
    return (
        <section className="flex flex-col gap-2 sm:flex-row">
            {cards.map(({ label, value, icon: Icon }) => (
                <div
                    key={label}
                    className="flex flex-1 min-w-0 items-center gap-2.5 rounded-xl border border-[#DCE5F3] bg-white px-3 py-2.5 shadow-[0_6px_16px_rgb(20_48_105_/_0.045)]"
                >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                        <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-[#65738A]">{label}</p>
                        <p className="mt-0.5 font-display text-2xl leading-none text-[#12234A]">
                            {isLoading ? '—' : value}
                        </p>
                    </div>
                </div>
            ))}
        </section>
    )
}
