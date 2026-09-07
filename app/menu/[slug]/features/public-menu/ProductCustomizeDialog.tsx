'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'
import type { CartSelection, PublicMenuProduct } from './types'

type ProductCustomizeDialogProps = {
    product: PublicMenuProduct | null
    onClose: () => void
    onAdd: (option: CartSelection | null, extras: CartSelection[]) => void
}

export function ProductCustomizeDialog({ product, onClose, onAdd }: ProductCustomizeDialogProps) {
    const [selectedOptionId, setSelectedOptionId] = useState(() => product?.options[0]?.id ?? '')
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([])

    const selectedOption = product?.options.find((option) => option.id === selectedOptionId)
    const selectedExtras = product?.extras.filter((extra) => selectedExtraIds.includes(extra.id)) ?? []
    const total = (product?.price ?? 0) + (selectedOption?.price ?? 0) + selectedExtras.reduce((sum, extra) => sum + extra.price, 0)

    const optionSelection: CartSelection | null = selectedOption ? { id: selectedOption.id, name: selectedOption.name, price: selectedOption.price ?? 0 } : null
    const extraSelections: CartSelection[] = selectedExtras.map((extra) => ({ id: extra.id, name: extra.name, price: extra.price }))

    if (!product) return null

    function toggleExtra(extraId: string) {
        setSelectedExtraIds((current) => current.includes(extraId) ? current.filter((id) => id !== extraId) : [...current, extraId])
    }

    return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#10224A]/25 p-0 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
        <section role="dialog" aria-modal="true" aria-labelledby="customize-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-lg sm:rounded-[24px]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">Personaliza tu pedido</p><h2 id="customize-title" className="mt-1 font-display text-xl tracking-[-.04em] text-[#12234A]">{product.name}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar personalización" className="grid size-9 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F5F8FC] hover:text-[#12234A]"><X className="size-4" /></button></div>
            <div className="space-y-6 px-5 py-5 sm:px-6"><div><div className="flex items-center justify-between gap-4"><h3 className="text-sm font-bold text-[#243556]">Elige una opción</h3><span className="text-xs text-[#8996A9]">{product.options.length ? 'Una opción' : 'Opcional'}</span></div>{product.options.length ? <div className="mt-3 space-y-2">{product.options.map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${selectedOptionId === option.id ? 'border-[#2451C5] bg-[#F4F7FF]' : 'border-[#E8EEF6] hover:border-[#BFCDE1]'}`}><input type="radio" name={`option-${product.id}`} value={option.id} checked={selectedOptionId === option.id} onChange={() => setSelectedOptionId(option.id)} className="size-4 accent-[#2451C5]" /><span className="flex-1 text-sm font-semibold text-[#243556]">{option.name}</span>{option.price ? <span className="text-xs font-bold text-[#2451C5]">+${option.price}</span> : <Check className="size-4 text-[#2451C5]" />}</label>)}</div> : <p className="mt-2 text-sm text-[#8996A9]">Este producto no tiene variantes.</p>}</div>{product.extras.length > 0 && <div><h3 className="text-sm font-bold text-[#243556]">Agrega extras</h3><div className="mt-3 space-y-2">{product.extras.map((extra) => <label key={extra.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${selectedExtraIds.includes(extra.id) ? 'border-[#2451C5] bg-[#F4F7FF]' : 'border-[#E8EEF6] hover:border-[#BFCDE1]'}`}><input type="checkbox" checked={selectedExtraIds.includes(extra.id)} onChange={() => toggleExtra(extra.id)} className="size-4 rounded accent-[#2451C5]" /><span className="flex-1 text-sm font-semibold text-[#243556]">{extra.name}</span><span className="text-xs font-bold text-[#2451C5]">+${extra.price}</span></label>)}</div></div>}</div>
            <div className="flex items-center justify-between gap-4 border-t border-[#E8EEF6] px-5 py-4 sm:px-6"><div><p className="text-xs text-[#8996A9]">Total de esta pieza</p><p className="font-display text-xl text-[#12234A]">${total.toLocaleString('es-MX')}</p></div><button type="button" onClick={() => { onAdd(optionSelection, extraSelections); onClose() }} className="rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20">Agregar al pedido</button></div>
        </section>
    </div>
}
