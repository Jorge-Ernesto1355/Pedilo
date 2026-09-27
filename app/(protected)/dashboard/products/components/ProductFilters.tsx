'use client'

import { Search } from 'lucide-react'
import type { ProductCategoryOption } from '../../features/dashboard-products/ProductAdminModal'
import type { ProductListParams } from '@/app/(protected)/create-menu/features/product-management/productApi'

type StatusFilter = '' | 'true' | 'false'
type Filters = {
    search: string
    categoryId: string
    active: StatusFilter
    createdFrom: string
    createdTo: string
    updatedFrom: string
    updatedTo: string
    sortBy: NonNullable<ProductListParams['sortBy']>
    sortOrder: 'asc' | 'desc'
}

export function ProductFilters({
    value,
    categories,
    onChange,
}: {
    value: Filters
    categories: ProductCategoryOption[]
    onChange: (patch: Partial<Filters>) => void
}) {
    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]" />
                    <input
                        value={value.search}
                        onChange={(event) => onChange({ search: event.target.value })}
                        placeholder="Buscar por nombre…"
                        className="w-full rounded-xl border border-[#D7E1EF] py-2.5 pl-9 pr-6 text-sm outline-none focus:border-[#2451C5]"
                    />
                </label>
                <Select
                    label="Categoría"
                    value={value.categoryId}
                    onChange={(categoryId) => onChange({ categoryId })}
                    options={[
                        { value: 'all', label: 'Todas las categorías' },
                        ...categories.map((item) => ({ value: item.id, label: item.label })),
                    ]}
                />
                <Select
                    label="Estado"
                    value={value.active}
                    onChange={(active) => onChange({ active: active as StatusFilter })}
                    options={[
                        { value: '', label: 'Todos los estados' },
                        { value: 'true', label: 'Activos' },
                        { value: 'false', label: 'Inactivos' },
                    ]}
                />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <DateInput
                    label="Creado desde"
                    value={value.createdFrom}
                    onChange={(createdFrom) => onChange({ createdFrom })}
                />
                <DateInput
                    label="Creado hasta"
                    value={value.createdTo}
                    onChange={(createdTo) => onChange({ createdTo })}
                />
                <DateInput
                    label="Actualizado desde"
                    value={value.updatedFrom}
                    onChange={(updatedFrom) => onChange({ updatedFrom })}
                />
                <DateInput
                    label="Actualizado hasta"
                    value={value.updatedTo}
                    onChange={(updatedTo) => onChange({ updatedTo })}
                />
                <div className="flex gap-2">
                    <Select
                        label="Ordenar por"
                        value={value.sortBy}
                        onChange={(sortBy) => onChange({ sortBy: sortBy as Filters['sortBy'] })}
                        options={[
                            { value: 'createdAt', label: 'Creación' },
                            { value: 'updatedAt', label: 'Actualización' },
                            { value: 'name', label: 'Nombre' },
                            { value: 'price', label: 'Precio' },
                            { value: 'sortOrder', label: 'Orden del menú' },
                        ]}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            onChange({ sortOrder: value.sortOrder === 'asc' ? 'desc' : 'asc' })
                        }
                        className="mt-[22px] rounded-xl border border-[#D7E1EF] px-3 text-xs font-bold text-[#2451C5]"
                    >
                        {value.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            </div>
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
                className="w-full min-w-0 rounded-xl border border-[#D7E1EF] bg-white px-2.5 py-2.5 text-xs text-[#243556] outline-none focus:border-[#2451C5]"
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
                className="w-full rounded-xl border border-[#D7E1EF] px-2.5 py-2.5 text-xs text-[#243556] outline-none focus:border-[#2451C5]"
            />
        </label>
    )
}
