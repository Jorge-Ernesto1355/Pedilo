'use client'

import { ChevronLeft, ChevronRight, Eye, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import type { Product } from '@/app/(protected)/create-menu/features/product-management/product.types'

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })

export function ProductTable({
    products,
    categoryNames,
    onView,
    onEdit,
    onToggle,
    onDelete,
    actionsPending = false,
}: {
    products: Product[]
    categoryNames: Map<string, string>
    onView: (product: Product) => void
    onEdit: (product: Product) => void
    onToggle: (product: Product) => void
    onDelete: (product: Product) => void
    actionsPending?: boolean
}) {
    return (
        <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
                <thead>
                    <tr className="border-b border-[#E8EEF6] text-xs uppercase tracking-[.08em] text-[#8996A9]">
                        <th className="px-3 py-3 font-semibold">Producto</th>
                        <th className="px-3 py-3 font-semibold">Categoría</th>
                        <th className="px-3 py-3 font-semibold">Precio</th>
                        <th className="px-3 py-3 font-semibold">Estado</th>
                        <th className="px-3 py-3 font-semibold">Actualizado</th>
                        <th className="px-3 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => (
                        <ProductRow
                            key={product.id}
                            product={product}
                            categoryName={
                                product.categoryName ?? categoryNames.get(product.categoryId)
                            }
                            onView={onView}
                            onEdit={onEdit}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            actionsPending={actionsPending}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function ProductRow({
    product,
    categoryName,
    onView,
    onEdit,
    onToggle,
    onDelete,
    actionsPending,
}: {
    product: Product
    categoryName?: string
    onView: (product: Product) => void
    onEdit: (product: Product) => void
    onToggle: (product: Product) => void
    onDelete: (product: Product) => void
    actionsPending?: boolean
}) {
    const enabled = product.active ?? product.isAvailable
    return (
        <tr className="border-b border-[#F0F3F8] text-sm text-[#243556] last:border-0 hover:bg-[#FAFCFF]">
            <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 overflow-hidden rounded-xl bg-[#EEF3FF]">
                        {product.imageUrl ? (
                            <img
                                width={40}
                                height={40}
                                src={product.imageUrl}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="grid h-full place-items-center text-xs text-[#2451C5]">
                                IMG
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-0.5 text-xs text-[#8996A9]">
                            Creado{' '}
                            {product.createdAt ? date.format(new Date(product.createdAt)) : '—'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-3 py-4 text-xs text-[#65738A]">{categoryName ?? 'Sin categoría'}</td>
            <td className="px-3 py-4 font-semibold">{money.format(Number(product.price))}</td>
            <td className="px-3 py-4">
                <button
                    type="button"
                    onClick={() => onToggle(product)}
                    disabled={actionsPending}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:cursor-wait disabled:opacity-50 ${enabled ? 'bg-[#EAF7EF] text-[#23794A]' : 'bg-[#F0F3F8] text-[#65738A]'}`}
                >
                    {actionsPending ? (
                        <LoaderCircle className="mx-auto size-3.5 animate-spin" />
                    ) : enabled ? (
                        'Activo'
                    ) : (
                        'Inactivo'
                    )}
                </button>
            </td>
            <td className="px-3 py-4 text-xs text-[#65738A]">
                {product.updatedAt ? date.format(new Date(product.updatedAt)) : '—'}
            </td>
            <td className="px-3 py-4">
                <div className="flex justify-end gap-1">
                    <ActionButton
                        disabled={actionsPending}
                        label={`Ver ${product.name}`}
                        onClick={() => onView(product)}
                    >
                        <Eye className="size-4" />
                    </ActionButton>
                    <ActionButton
                        disabled={actionsPending}
                        label={`Editar ${product.name}`}
                        onClick={() => onEdit(product)}
                    >
                        <Pencil className="size-4" />
                    </ActionButton>
                    <ActionButton
                        label={`Eliminar ${product.name}`}
                        onClick={() => onDelete(product)}
                        disabled={actionsPending}
                        danger
                    >
                        <Trash2 className="size-4" />
                    </ActionButton>
                </div>
            </td>
        </tr>
    )
}

function ActionButton({
    label,
    onClick,
    children,
    danger = false,
    disabled = false,
}: {
    label: string
    onClick: () => void
    children: React.ReactNode
    danger?: boolean
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className={`grid size-8 place-items-center rounded-lg transition disabled:cursor-wait disabled:opacity-50 ${danger ? 'text-[#B42318] hover:bg-[#FFF1F0]' : 'text-[#65738A] hover:bg-[#EEF3FF] hover:text-[#2451C5]'}`}
        >
            {disabled ? <LoaderCircle className="size-4 animate-spin" /> : children}
        </button>
    )
}

export function ProductPagination({
    page,
    totalPages,
    onChange,
}: {
    page: number
    totalPages: number
    onChange: (page: number) => void
}) {
    return (
        <div className="mt-5 flex items-center justify-between border-t border-[#E8EEF6] pt-4 text-sm text-[#65738A]">
            <span>
                Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    className="grid size-8 place-items-center rounded-lg border border-[#D7E1EF] disabled:opacity-40"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onChange(page + 1)}
                    className="grid size-8 place-items-center rounded-lg border border-[#D7E1EF] disabled:opacity-40"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </div>
    )
}
