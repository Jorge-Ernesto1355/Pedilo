/* eslint-disable @next/next/no-img-element -- Product images are local object URLs until upload integration exists. */

'use client'

import { ImagePlus, PackagePlus, Plus } from 'lucide-react'
import type { SavedProduct } from './product.schema'

type ProductCatalogCardProps = { products: SavedProduct[]; onAddProduct: () => void }

export function ProductCatalogCard({ products, onAddProduct }: ProductCatalogCardProps) {
    return (
        <section aria-labelledby="catalog-title" className="rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_22px_70px_-52px_rgba(19,49,117,.4)] sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">Tu catálogo</p><h2 id="catalog-title" className="mt-1 font-display text-2xl tracking-[-.05em] text-[#10224A]">Productos del menú</h2></div><span className="text-xs font-semibold text-[#8996A9]">{products.length} {products.length === 1 ? 'producto' : 'productos'}</span></div>
            {products.length > 0 && <div className="mb-4 grid gap-2.5 sm:grid-cols-2">{products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#E8EEF6] bg-[#FBFCFE] p-3"><div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EEF3FF] text-[#2451C5]">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-[#243556]">{product.name}</p><p className="mt-0.5 text-xs text-[#8996A9]">{product.category} · ${Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div></div>)}</div>}
            <button type="button" onClick={onAddProduct} className="group flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] text-center transition hover:border-[#2451C5] hover:bg-[#F4F7FF]"><span className="mb-3 grid size-11 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5] transition group-hover:scale-105 group-hover:bg-[#DCE7FF]"><PackagePlus className="size-5" /></span><span className="flex items-center gap-1.5 text-sm font-bold text-[#243556]">Agregar producto <Plus className="size-4 text-[#2451C5]" /></span><span className="mt-1 text-xs text-[#8996A9]">Crea una ficha para tu menú</span></button>
        </section>
    )
}
