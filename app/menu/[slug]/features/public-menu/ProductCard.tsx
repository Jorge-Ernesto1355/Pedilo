/* eslint-disable @next/next/no-img-element -- Product media comes from the public API and is not configured for next/image. */

'use client'

import { Plus, SlidersHorizontal, Utensils } from 'lucide-react'
import { useState } from 'react'
import type { PublicProduct } from './publicCatalog.types'
import { hasRequiredOptionGroups } from './optionGroupValidation'

export function ProductCard({
    product,
    onSelect,
    onAdd,
}: {
    product: PublicProduct
    onSelect: () => void
    onAdd: () => void
}) {
    const requiresCustomization = hasRequiredOptionGroups(product)
    const [feedbackKey, setFeedbackKey] = useState(0)

    function handleAdd() {
        onAdd()
        setFeedbackKey((current) => current + 1)
    }

    return (
        <article className="flex w-full gap-4 border-b border-[#E8EEF6] py-5 text-left last:border-b-0 last:pb-0 first:pt-0 sm:gap-5">
            <div
                data-product-image={product.id}
                className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EEF3FF] text-[#2451C5] sm:size-28"
            >
                {product.imageUrl ? (
                    <img
                        width={112}
                        height={112}
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Utensils className="size-6" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={onSelect} className="min-w-0 text-left">
                        <h3 className="font-display text-base tracking-[-.025em] text-[#12234A]">
                            {product.name}
                        </h3>
                        {product.description && (
                            <p className="mt-1 text-sm leading-5 text-[#65738A]">
                                {product.description}
                            </p>
                        )}
                    </button>
                    <p className="shrink-0 text-lg font-bold text-[#1E40AF]">
                        ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={requiresCustomization ? onSelect : handleAdd}
                    aria-label={`${requiresCustomization ? 'Seleccionar opciones para' : 'Agregar al carrito:'} ${product.name}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#EEF3FF] px-3 py-2 text-xs font-bold text-[#2451C5] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#E2EBFF] active:scale-[.98] sm:min-h-8 sm:px-2.5 sm:py-1.5"
                >
                    {requiresCustomization ? (
                        <SlidersHorizontal className="size-3.5" />
                    ) : (
                        <span
                            key={feedbackKey}
                            className={feedbackKey > 0 ? 'pedilo-cart-add-feedback' : undefined}
                        >
                            <Plus className="size-3.5" />
                        </span>
                    )}
                    {requiresCustomization ? 'Seleccionar opciones' : 'Agregar al carrito'}
                </button>
            </div>
        </article>
    )
}
