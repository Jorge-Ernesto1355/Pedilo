'use client'

import { useState } from 'react'
import { Plus, SlidersHorizontal, Utensils } from 'lucide-react'
import { ProgressiveImage } from '@/app/(protected)/create-menu/features/business-profile/ProgressiveImage'
import type { PublicProduct } from '@/app/menu/[slug]/features/public-menu/publicCatalog.types'
import { hasAvailableOptions } from '@/app/menu/[slug]/features/public-menu/optionGroupValidation'

const money = (value: number) => value.toLocaleString('es-MX', { minimumFractionDigits: 2 })

/** Tarjeta de producto para la cuadrícula de 2 columnas del drawer en pantallas chicas. */
export function CompactProductCard({
    product,
    onSelect,
    onAdd,
}: {
    product: PublicProduct
    onSelect: () => void
    onAdd: () => void
}) {
    const hasOptions = hasAvailableOptions(product)
    const [feedbackKey, setFeedbackKey] = useState(0)
    const price = product.priceFinal ?? product.price_final ?? product.price
    const originalPrice = product.priceOriginal ?? product.price_original ?? product.price

    return (
        <article
            data-cy="public-product-card"
            data-product-id={product.id}
            className="flex min-w-0 gap-2 rounded-2xl border border-[#E3EAF6] bg-white p-2 shadow-[0_1px_3px_rgb(18_35_74_/_0.06)]"
        >
            <div
                data-product-image={product.id}
                className="grid size-14 shrink-0 place-items-center self-center overflow-hidden rounded-xl bg-[#EEF3FF] text-[#2451C5]"
            >
                {product.imageUrl ? (
                    <ProgressiveImage
                        width={56}
                        height={56}
                        src={product.imageUrl}
                        alt=""
                        sizes="56px"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Utensils className="size-5" />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                <button
                    type="button"
                    onClick={onSelect}
                    className="min-w-0 text-left [overflow-wrap:anywhere]"
                >
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-4 text-[#12234A]">
                        {product.name}
                    </h3>
                </button>
                <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                        <p
                            className={`truncate text-sm font-bold leading-4 ${product.discount ? 'text-[#16803D]' : 'text-[#1E40AF]'}`}
                        >
                            ${money(price)}
                        </p>
                        {product.discount && (
                            <p className="text-[10px] leading-3 text-[#8996A9] line-through">
                                ${money(originalPrice)}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={
                            hasOptions
                                ? onSelect
                                : () => {
                                      onAdd()
                                      setFeedbackKey((current) => current + 1)
                                  }
                        }
                        aria-label={`${hasOptions ? 'Seleccionar opciones para' : 'Agregar al carrito:'} ${product.name}`}
                        // El ::after amplía el área táctil a 44px sin agrandar el botón.
                        className="relative grid size-7 shrink-0 place-items-center rounded-full bg-[#EEF3FF] text-[#2451C5] transition-[background-color,transform] duration-200 after:absolute after:-inset-2 after:content-[''] hover:bg-[#E2EBFF] active:scale-95"
                    >
                        {hasOptions ? (
                            <SlidersHorizontal className="size-3.5" />
                        ) : (
                            <span
                                key={feedbackKey}
                                className={feedbackKey > 0 ? 'pedilo-cart-add-feedback' : undefined}
                            >
                                <Plus className="size-4" strokeWidth={2.5} />
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </article>
    )
}
