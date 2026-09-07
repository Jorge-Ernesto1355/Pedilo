/* eslint-disable @next/next/no-img-element -- Mock menu images will move behind the API media layer. */

'use client'

import { Plus, SlidersHorizontal, Utensils } from 'lucide-react'
import type { PublicMenuProduct } from './types'

export function ProductCard({ product, onAdd, onCustomize }: { product: PublicMenuProduct; onAdd: () => void; onCustomize: () => void }) {
    const customizable = product.options.length > 0 || product.extras.length > 0
    return <article className="flex gap-4 border-b border-[#E8EEF6] py-5 last:border-b-0 last:pb-0 first:pt-0 sm:gap-5">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EEF3FF] text-[#2451C5] sm:size-28">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Utensils className="size-6" />}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><div><h3 className="font-display text-base tracking-[-.025em] text-[#12234A]">{product.name}</h3><p className="mt-1 text-sm leading-5 text-[#65738A]">{product.description}</p></div><p className="shrink-0 text-sm font-bold text-[#1E40AF]">${product.price.toLocaleString('es-MX')}</p></div><div className="mt-3 flex items-center justify-between gap-3">{customizable ? <button type="button" onClick={onCustomize} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2451C5] transition hover:text-[#183991]"><SlidersHorizontal className="size-3.5" />Personalizar</button> : <span />}{customizable ? <button type="button" onClick={onCustomize} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20">Elegir <Plus className="size-3.5" /></button> : <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20">Agregar <Plus className="size-3.5" /></button>}</div></div>
    </article>
}
