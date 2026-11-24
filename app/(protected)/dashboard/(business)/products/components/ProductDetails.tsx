/* eslint-disable @next/next/no-img-element -- Product images are served from the catalog API. */
'use client'

import { Modal } from '@/app/components/ui/Modal'
import type { Product } from '@/app/(protected)/create-menu/features/product-management/product.types'
import { useCombo } from '@/app/(protected)/create-menu/features/product-management/useComboManagement'

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
    const comboQuery = useCombo(open && product?.type === 'COMBO' ? product.id : null)
    const combo = comboQuery.data
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
                                    width={160}
                                    height={160}
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
                    {product.type === 'COMBO' ? (
                        <div className="space-y-4">
                            {comboQuery.isLoading ? (
                                <p role="status" className="text-sm text-[#65738A]">
                                    Cargando configuración del combo…
                                </p>
                            ) : comboQuery.isError || !combo ? (
                                <p role="alert" className="text-sm text-[#B42318]">
                                    No pudimos cargar los productos y opciones de este combo.
                                </p>
                            ) : (
                                <>
                                    <section className="rounded-xl border border-[#CFE3D7] bg-[#F7FBF8] p-4">
                                        <h3 className="text-sm font-bold text-[#245B3B]">
                                            📦 Productos incluidos
                                        </h3>
                                        <p className="mt-1 text-xs text-[#4C6A57]">
                                            El cliente recibe todos estos productos.
                                        </p>
                                        {combo.includedProducts.length ? (
                                            <ul className="mt-3 space-y-2">
                                                {combo.includedProducts.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex justify-between gap-3 text-sm text-[#243556]"
                                                    >
                                                        <span>{item.product.name}</span>
                                                        <span className="text-xs text-[#65738A]">
                                                            ${Number(item.product.price).toFixed(2)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-2 text-sm text-[#8996A9]">
                                                Este combo no tiene productos obligatorios.
                                            </p>
                                        )}
                                    </section>
                                    <section className="rounded-xl border border-[#EAE3D6] bg-[#FFFEFB] p-4">
                                        <h3 className="text-sm font-bold text-[#493D2C]">
                                            🔀 Opciones para el cliente
                                        </h3>
                                        <p className="mt-1 text-xs text-[#786D5F]">
                                            El cliente elige entre estas alternativas según cada
                                            regla.
                                        </p>
                                        {combo.optionGroups.length ? (
                                            <div className="mt-3 space-y-3">
                                                {combo.optionGroups.map((group) => (
                                                    <article
                                                        key={group.id}
                                                        className="rounded-lg border border-[#EAE3D6] bg-white p-3"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <h4 className="text-sm font-semibold text-[#493D2C]">
                                                                {group.name}
                                                            </h4>
                                                            <span className="text-xs text-[#786D5F]">
                                                                {group.minSelections ===
                                                                group.maxSelections
                                                                    ? `El cliente elige ${group.minSelections} ${group.minSelections === 1 ? 'opción' : 'opciones'}`
                                                                    : group.minSelections === 0
                                                                      ? `El cliente puede elegir hasta ${group.maxSelections} ${group.maxSelections === 1 ? 'opción' : 'opciones'} (opcional)`
                                                                      : `El cliente debe elegir entre ${group.minSelections} y ${group.maxSelections} opciones`}
                                                            </span>
                                                        </div>
                                                        <ul className="mt-2 flex flex-wrap gap-2">
                                                            {group.products.map((choice) => (
                                                                <li
                                                                    key={choice.id}
                                                                    className="rounded-md bg-[#F6F3ED] px-2.5 py-1 text-xs text-[#574A38]"
                                                                >
                                                                    {choice.product.name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-[#8996A9]">
                                                Este combo todavía no tiene opciones elegibles.
                                            </p>
                                        )}
                                    </section>
                                </>
                            )}
                        </div>
                    ) : (
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
                    )}
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
