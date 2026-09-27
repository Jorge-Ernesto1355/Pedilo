'use client'

import { Modal } from '@/app/components/ui/Modal'
import type { Product } from '@/app/(protected)/create-menu/features/product-management/product.types'

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })

export function ProductDetails({
    open,
    product,
    categoryName,
    isLoading,
    onClose,
}: {
    open: boolean
    product?: Product
    categoryName?: string
    isLoading: boolean
    onClose: () => void
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={product?.name ?? 'Detalle del producto'}
            description="Información actual del producto y sus opciones."
            size="lg"
        >
            {isLoading ? (
                <p className="py-10 text-center text-sm text-[#65738A]">Cargando detalle…</p>
            ) : product ? (
                <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                        <div className="aspect-square overflow-hidden rounded-2xl bg-[#EEF3FF]">
                            {product.imageUrl && (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-[#65738A]">
                                {product.description || 'Sin descripción'}
                            </p>
                            <p className="text-2xl font-bold text-[#2451C5]">
                                {money.format(Number(product.price))}
                            </p>
                            <p className="text-sm text-[#65738A]">
                                Categoría:{' '}
                                <strong className="text-[#243556]">
                                    {categoryName ?? product.categoryName ?? 'Sin categoría'}
                                </strong>
                            </p>
                            <p className="text-sm text-[#65738A]">
                                Estado:{' '}
                                <strong className="text-[#243556]">
                                    {(product.active ?? product.isAvailable)
                                        ? 'Activo'
                                        : 'Inactivo'}
                                </strong>
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#12234A]">Grupos de opciones</h3>
                        {product.optionGroups?.length ? (
                            <div className="mt-3 space-y-3">
                                {product.optionGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="rounded-xl border border-[#E8EEF6] p-3"
                                    >
                                        <div className="flex justify-between gap-3">
                                            <p className="text-sm font-semibold text-[#243556]">
                                                {group.name}
                                            </p>
                                            <span className="text-xs text-[#65738A]">
                                                {group.isRequired ? 'Obligatorio' : 'Opcional'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-[#65738A]">
                                            {group.options
                                                ?.map(
                                                    (option) =>
                                                        `${option.name}${Number(option.price) > 0 ? ` +${money.format(Number(option.price))}` : ''}`,
                                                )
                                                .join(' · ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-[#8996A9]">
                                Este producto no tiene grupos de opciones.
                            </p>
                        )}
                    </div>
                    <div className="border-t border-[#E8EEF6] pt-4 text-xs text-[#8996A9]">
                        Creado: {product.createdAt ? date.format(new Date(product.createdAt)) : '—'}{' '}
                        · Actualizado:{' '}
                        {product.updatedAt ? date.format(new Date(product.updatedAt)) : '—'}
                    </div>
                </div>
            ) : (
                <p className="text-sm text-[#B42318]">No encontramos este producto.</p>
            )}
        </Modal>
    )
}
