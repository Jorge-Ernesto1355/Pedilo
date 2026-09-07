'use client'

import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import type { CartLine } from './types'

type OrderDrawerProps = {
    lines: CartLine[]
    totalItems: number
    total: number
    open: boolean
    businessName: string
    onChangeQuantity: (key: string, delta: number) => void
    onOpen: () => void
    onClose: () => void
    onCheckout: (customerName: string) => void
}

export function OrderDrawer({ lines, totalItems, total, open, businessName, onChangeQuantity, onOpen, onClose, onCheckout }: OrderDrawerProps) {
    const [customerName, setCustomerName] = useState('')

    return <>
        {totalItems > 0 && !open && <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6"><button type="button" onClick={onOpen} className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl bg-[#1E40AF] px-4 py-3.5 text-left text-white shadow-[0_16px_36px_rgb(30_64_175_/_0.28)] transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25"><span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><ShoppingBag className="size-4" /></span><span><span className="block text-sm font-bold">Ver mi pedido</span><span className="block text-xs text-white/70">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</span></span></span><span className="text-sm font-bold">${total.toLocaleString('es-MX')}</span></button></div>}
        {open && <div className="fixed inset-0 z-50 bg-[#10224A]/25" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside role="dialog" aria-modal="true" aria-labelledby="order-title" className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:inset-y-0 sm:left-auto sm:w-[min(100%,440px)] sm:rounded-none sm:rounded-l-[24px]"><div className="flex items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">Tu pedido</p><h2 id="order-title" className="mt-1 font-display text-xl tracking-[-.04em] text-[#12234A]">Listo para {businessName}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar pedido" className="grid size-9 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F5F8FC] hover:text-[#12234A]"><X className="size-4" /></button></div><div className="space-y-5 px-5 py-5 sm:px-6">{lines.length > 0 ? <div className="space-y-4">{lines.map((line) => <div key={line.key} className="flex gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#243556]">{line.product.name}</p>{line.option && <p className="mt-1 text-xs text-[#65738A]">{line.option.name}</p>}{line.extras.length > 0 && <p className="mt-0.5 text-xs text-[#65738A]">+ {line.extras.map((extra) => extra.name).join(', ')}</p>}<p className="mt-1 text-xs font-semibold text-[#2451C5]">${line.unitPrice.toLocaleString('es-MX')} c/u</p></div><div className="flex h-8 items-center gap-2 rounded-lg border border-[#DCE5F3] px-1"><button type="button" onClick={() => onChangeQuantity(line.key, -1)} aria-label={`Quitar una unidad de ${line.product.name}`} className="grid size-6 place-items-center rounded text-[#65738A] hover:bg-[#F5F8FC]"><Minus className="size-3" /></button><span className="w-4 text-center text-xs font-bold text-[#12234A]">{line.quantity}</span><button type="button" onClick={() => onChangeQuantity(line.key, 1)} aria-label={`Agregar una unidad de ${line.product.name}`} className="grid size-6 place-items-center rounded text-[#2451C5] hover:bg-[#EAF0FF]"><Plus className="size-3" /></button></div></div>)}</div> : <p className="rounded-xl bg-[#F8FAFE] p-4 text-sm text-[#65738A]">Tu pedido está vacío.</p>}<div className="border-t border-[#E8EEF6] pt-4"><label htmlFor="customer-name" className="mb-2 block text-sm font-bold text-[#243556]">¿A nombre de quién va?</label><input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ej. Jorge" className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" /><button type="button" disabled={!customerName.trim() || lines.length === 0} onClick={() => onCheckout(customerName.trim())} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#1E40AF] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-45">Enviar por WhatsApp <span>${total.toLocaleString('es-MX')}</span></button><p className="mt-2 text-center text-[11px] leading-4 text-[#8996A9]">Se abrirá WhatsApp con tu pedido listo para enviar.</p></div></div></aside></div>}
    </>
}
