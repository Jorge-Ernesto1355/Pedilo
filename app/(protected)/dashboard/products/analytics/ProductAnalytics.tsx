'use client'

import type { ProductCategoryOption } from '../../features/dashboard-products/ProductAdminModal'
import type { ProductRanking } from '@/app/(protected)/create-menu/features/product-management/productApi'

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

type AnalyticsParams = {
    category: string
    from: string
    to: string
    limit: number
    setCategory: (value: string) => void
    setFrom: (value: string) => void
    setTo: (value: string) => void
    setLimit: (value: number) => void
}

export function ProductAnalytics({
    categories,
    params,
    bestSelling,
    mostRequested,
    summary,
    isLoading,
}: {
    categories: ProductCategoryOption[]
    params: AnalyticsParams
    bestSelling: ProductRanking[]
    mostRequested: ProductRanking[]
    summary?: { categoriesWithProducts: number }
    isLoading: boolean
}) {
    return (
        <section className="rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#A46B00]">
                        Analytics
                    </p>
                    <h2 className="mt-1 font-display text-xl tracking-[-.035em] text-[#12234A]">
                        Qué están pidiendo tus clientes
                    </h2>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    <DateInput label="Desde" value={params.from} onChange={params.setFrom} />
                    <DateInput label="Hasta" value={params.to} onChange={params.setTo} />
                    <Select
                        label="Categoría"
                        value={params.category}
                        onChange={params.setCategory}
                        options={[
                            { value: 'all', label: 'Todas' },
                            ...categories.map((item) => ({ value: item.id, label: item.label })),
                        ]}
                    />
                    <Select
                        label="Límite"
                        value={String(params.limit)}
                        onChange={(value) => params.setLimit(Number(value))}
                        options={['5', '10', '20'].map((value) => ({
                            value,
                            label: `${value} productos`,
                        }))}
                    />
                </div>
            </div>
            {summary && (
                <p className="mt-3 text-xs text-[#65738A]">
                    El catálogo tiene productos distribuidos en{' '}
                    <strong className="text-[#243556]">{summary.categoriesWithProducts}</strong>{' '}
                    categorías.
                </p>
            )}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Ranking
                    title="Más vendidos"
                    rows={bestSelling}
                    type="selling"
                    isLoading={isLoading}
                />
                <Ranking
                    title="Más solicitados"
                    rows={mostRequested}
                    type="requested"
                    isLoading={isLoading}
                />
            </div>
        </section>
    )
}

function Ranking({
    title,
    rows,
    type,
    isLoading,
}: {
    title: string
    rows: ProductRanking[]
    type: 'selling' | 'requested'
    isLoading: boolean
}) {
    return (
        <div className="rounded-xl border border-[#E8EEF6] p-4">
            <h3 className="font-semibold text-[#12234A]">{title}</h3>
            {isLoading ? (
                <p className="py-8 text-center text-sm text-[#8996A9]">Cargando analytics…</p>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#8996A9]">
                    Aún no hay datos para este periodo.
                </p>
            ) : (
                <div className="mt-4 space-y-3">
                    {rows.map((row, index) => (
                        <div key={`${row.productId}-${index}`} className="flex items-center gap-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F5F8FC] text-xs font-bold text-[#2451C5]">
                                {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#243556]">
                                    {row.productName}
                                </p>
                                <p className="text-xs text-[#8996A9]">
                                    {type === 'selling'
                                        ? `${row.soldQuantity ?? 0} unidades · ${row.orderCount ?? 0} órdenes`
                                        : `${row.requestedQuantity ?? 0} unidades · ${row.orderCount ?? 0} órdenes`}
                                </p>
                            </div>
                            {type === 'selling' && (
                                <span className="text-sm font-bold text-[#23794A]">
                                    {money.format(row.revenue ?? 0)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function Select({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-[11px] font-semibold text-[#8996A9]">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-[132px] min-w-0 rounded-xl border border-[#D7E1EF] bg-white px-2.5 py-2.5 text-xs text-[#243556] outline-none focus:border-[#2451C5]"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    )
}
function DateInput({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#8996A9]">{label}</span>
            <input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-[132px] rounded-xl border border-[#D7E1EF] px-2.5 py-2.5 text-xs text-[#243556] outline-none focus:border-[#2451C5]"
            />
        </label>
    )
}
