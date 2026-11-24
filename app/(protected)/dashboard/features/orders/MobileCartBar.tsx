'use client'

import { QtyNumber } from '@/app/components/ui/QtyNumber'
import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, ChevronUp, Minus, Plus, ShoppingCart } from 'lucide-react'
import type { useOrderCart } from '@/app/menu/[slug]/features/public-menu/useOrderCart'

const money = (value: number) => value.toLocaleString('es-MX', { minimumFractionDigits: 2 })

/**
 * Barra inferior del drawer de nueva orden en pantallas chicas: resumen del carrito y
 * "Continuar". Al tocar el resumen se abre un popover con los productos en filas
 * compactas (no ocupa el flujo: sale hacia arriba, sobre el catálogo).
 */
export function MobileCartBar({
    cart,
    onContinue,
}: {
    cart: ReturnType<typeof useOrderCart>
    onContinue: () => void
}) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const popoverId = useId()
    const isEmpty = cart.lines.length === 0
    const expanded = open && !isEmpty

    useEffect(() => {
        if (!expanded) return
        function handlePointerDown(event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return
            // El drawer no debe interpretar este Escape como "cerrar todo".
            event.stopPropagation()
            setOpen(false)
        }
        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [expanded])

    return (
        <div
            ref={containerRef}
            data-cy="mobile-cart-bar"
            className="relative shrink-0 border-t border-[#DCE5F3] bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        >
            {expanded && (
                <div
                    id={popoverId}
                    role="group"
                    aria-label="Productos de la orden"
                    data-cy="mobile-cart-popover"
                    className="absolute inset-x-2.5 bottom-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-2xl border border-[#DCE5F3] bg-white shadow-[0_12px_32px_-12px_rgb(18_35_74_/_0.35)]"
                >
                    <ul className="max-h-[40svh] divide-y divide-[#EEF2F8] overflow-y-auto px-3">
                        {cart.lines.map((line) => (
                            <li key={line.key} className="flex items-center gap-2 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-semibold text-[#243556]">
                                        {line.product.name}
                                    </p>
                                    {line.selections.length > 0 && (
                                        <p className="truncate text-[11px] text-[#65738A]">
                                            {line.selections
                                                .map((selection) => selection.name)
                                                .join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex h-8 shrink-0 items-center rounded-lg border border-[#DCE5F3]">
                                    <button
                                        type="button"
                                        onClick={() => cart.changeQuantity(line.key, -1)}
                                        aria-label={`Quitar una unidad de ${line.product.name}`}
                                        className="pedilo-squish grid size-8 place-items-center text-[#65738A]"
                                    >
                                        <Minus className="size-3.5" />
                                    </button>
                                    <QtyNumber
                                        className="w-4 text-center text-xs font-bold text-[#12234A]"
                                        value={line.quantity}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => cart.changeQuantity(line.key, 1)}
                                        aria-label={`Agregar una unidad de ${line.product.name}`}
                                        className="pedilo-squish grid size-8 place-items-center text-[#2451C5]"
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                </div>
                                <span className="w-[4.5rem] shrink-0 text-right text-[13px] font-bold text-[#12234A]">
                                    ${money(line.unitPrice * line.quantity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-[#DCE5F3] bg-[#F8FAFE] px-3 py-2.5">
                        <span className="text-xs text-[#65738A]">Total estimado</span>
                        <strong className="font-display text-base text-[#12234A]">
                            ${money(cart.total)}
                        </strong>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={isEmpty}
                    aria-expanded={expanded}
                    aria-controls={expanded ? popoverId : undefined}
                    onClick={() => setOpen((current) => !current)}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 text-left disabled:cursor-default"
                >
                    <span className="relative shrink-0 text-[#12234A]">
                        <ShoppingCart className="size-6" aria-hidden="true" />
                        {!isEmpty && (
                            <span className="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#2451C5] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                                {cart.totalItems > 99 ? '99+' : cart.totalItems}
                            </span>
                        )}
                    </span>
                    <span className="truncate text-sm font-bold text-[#12234A]">
                        {cart.totalItems} {cart.totalItems === 1 ? 'producto' : 'productos'}
                    </span>
                    {!isEmpty && (
                        <ChevronUp
                            className={`size-4 shrink-0 text-[#65738A] transition-transform ${expanded ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                        />
                    )}
                </button>
                <span className="h-8 w-px shrink-0 bg-[#E3EAF6]" aria-hidden="true" />
                <button
                    type="button"
                    disabled={isEmpty}
                    onClick={onContinue}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2451C5] px-4 text-sm font-bold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Continuar
                    <ArrowRight className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    )
}
