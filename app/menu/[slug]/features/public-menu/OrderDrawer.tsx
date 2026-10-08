'use client'

import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import type { CartLine } from './types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'

type OrderDrawerProps = {
    lines: CartLine[]
    totalItems: number
    total: number
    open: boolean
    businessName: string
    onChangeQuantity: (key: string, delta: number) => void
    onOpen: () => void
    onClose: () => void
    onCheckout: (customerName: string, customerPhone: string, notes: string) => void
    isSubmitting?: boolean
    phoneError?: string | null
    orderError?: string | null
    cartTargetRef?: React.Ref<HTMLButtonElement>
    cartPulse?: number
}

export function OrderDrawer({
    lines,
    totalItems,
    total,
    open,
    businessName,
    onChangeQuantity,
    onOpen,
    onClose,
    onCheckout,
    isSubmitting = false,
    phoneError,
    orderError,
    cartTargetRef,
    cartPulse = 0,
}: OrderDrawerProps) {
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const reducedMotion = useReducedMotion()
    const phoneIsValid = isValidPhone(customerPhone)

    return (
        <>
            {totalItems > 0 && !open && (
                <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
                    <motion.button
                        ref={cartTargetRef}
                        type="button"
                        onClick={onOpen}
                        initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
                        animate={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            duration: reducedMotion ? 0 : 0.34,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl bg-[#1E40AF] px-4 py-3.5 text-left text-white shadow-[0_16px_36px_rgb(30_64_175_/_0.28)] transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25"
                    >
                        <span className="flex items-center gap-3">
                            <motion.span
                                key={cartPulse}
                                initial={!reducedMotion && cartPulse > 0 ? { scale: 0.92 } : false}
                                animate={
                                    !reducedMotion && cartPulse > 0
                                        ? { scale: [0.92, 1.08, 1] }
                                        : undefined
                                }
                                transition={{ duration: reducedMotion ? 0 : 0.26, ease: 'easeOut' }}
                                className="grid size-9 place-items-center rounded-xl bg-white/15"
                            >
                                <ShoppingBag className="size-4" />
                            </motion.span>
                            <span>
                                <span className="block text-sm font-bold">Ver mi pedido</span>
                                <span className="block text-xs text-white/70">
                                    {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                                </span>
                            </span>
                        </span>
                        <span className="text-sm font-bold">${total.toLocaleString('es-MX')}</span>
                    </motion.button>
                </div>
            )}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-[#10224A]/25"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) onClose()
                    }}
                >
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-title"
                        className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:inset-y-0 sm:left-auto sm:w-[min(100%,440px)] sm:rounded-none sm:rounded-l-[24px]"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4 sm:px-6">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                                    Tu pedido
                                </p>
                                <h2
                                    id="order-title"
                                    className="mt-1 font-display text-xl tracking-[-.04em] text-[#12234A]"
                                >
                                    Listo para {businessName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar pedido"
                                className="grid size-9 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F5F8FC] hover:text-[#12234A]"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="space-y-5 px-5 py-5 sm:px-6">
                            {lines.length > 0 ? (
                                <div className="space-y-4">
                                    {lines.map((line) => (
                                        <div key={line.key} className="flex gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-[#243556]">
                                                    {line.product.name}
                                                </p>
                                                {line.selections.length > 0 && (
                                                    <p className="mt-0.5 text-xs text-[#65738A]">
                                                        {line.selections
                                                            .map(
                                                                (selection) =>
                                                                    `${selection.name}${selection.quantity > 1 ? ` ×${selection.quantity}` : ''}`,
                                                            )
                                                            .join(', ')}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs font-semibold text-[#2451C5]">
                                                    ${line.unitPrice.toLocaleString('es-MX')} c/u
                                                </p>
                                            </div>
                                            <div className="flex min-h-11 items-center gap-1 rounded-lg border border-[#DCE5F3] px-1 sm:min-h-8 sm:gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onChangeQuantity(line.key, -1)}
                                                    aria-label={`Quitar una unidad de ${line.product.name}`}
                                                    className="grid size-10 place-items-center rounded text-[#65738A] hover:bg-[#F5F8FC] sm:size-6"
                                                >
                                                    <Minus className="size-3" />
                                                </button>
                                                <span className="w-4 text-center text-xs font-bold text-[#12234A]">
                                                    {line.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onChangeQuantity(line.key, 1)}
                                                    aria-label={`Agregar una unidad de ${line.product.name}`}
                                                    className="grid size-10 place-items-center rounded text-[#2451C5] hover:bg-[#EAF0FF] sm:size-6"
                                                >
                                                    <Plus className="size-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-xl bg-[#F8FAFE] p-4 text-sm text-[#65738A]">
                                    Tu pedido está vacío.
                                </p>
                            )}
                            <div className="border-t border-[#E8EEF6] pt-4">
                                <label
                                    htmlFor="customer-name"
                                    className="mb-2 block text-sm font-bold text-[#243556]"
                                >
                                    ¿A nombre de quién va?
                                </label>
                                <input
                                    id="customer-name"
                                    name="customerName"
                                    autoComplete="name"
                                    value={customerName}
                                    onChange={(event) => setCustomerName(event.target.value)}
                                    placeholder="Ej. Jorge"
                                    className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                />
                                <label
                                    htmlFor="customer-phone"
                                    className="mb-2 mt-3 block text-sm font-bold text-[#243556]"
                                >
                                    Teléfono
                                </label>
                                <input
                                    id="customer-phone"
                                    name="customerPhone"
                                    autoComplete="tel"
                                    value={customerPhone}
                                    onChange={(event) =>
                                        setCustomerPhone(sanitizePhoneInput(event.target.value))
                                    }
                                    placeholder="Ej. 669-123-4567"
                                    inputMode="tel"
                                    className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                />
                                {customerPhone.length > 0 && !phoneIsValid && (
                                    <p className="mt-1.5 text-xs text-[#B42318]">
                                        Usa 10 números, por ejemplo 669-123-4567. No uses +52.
                                    </p>
                                )}
                                {phoneError && (
                                    <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                                        {phoneError}
                                    </p>
                                )}
                                <label
                                    htmlFor="order-notes"
                                    className="mb-2 mt-3 block text-sm font-bold text-[#243556]"
                                >
                                    Notas{' '}
                                    <span className="font-normal text-[#8996A9]">(opcional)</span>
                                </label>
                                <textarea
                                    id="order-notes"
                                    name="notes"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Ej. Sin cebolla"
                                    rows={2}
                                    className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                />
                                <p className="mt-3 rounded-xl bg-[#F5F8FC] px-3 py-2.5 text-xs leading-5 text-[#65738A]">
                                    Al confirmar, estos datos y el detalle de tu pedido se
                                    compartirán con{' '}
                                    <strong className="font-semibold text-[#243556]">
                                        {businessName}
                                    </strong>{' '}
                                    para que pueda revisarlo y responderte por WhatsApp. Pedilo es
                                    la plataforma tecnológica y no realiza el reparto. Consulta el{' '}
                                    <Link
                                        href="/privacidad"
                                        className="font-semibold text-[#2451C5] underline underline-offset-2"
                                    >
                                        Aviso de Privacidad
                                    </Link>
                                    .
                                </p>
                                <button
                                    type="button"
                                    disabled={
                                        !customerName.trim() ||
                                        !customerPhone.trim() ||
                                        !phoneIsValid ||
                                        lines.length === 0 ||
                                        isSubmitting
                                    }
                                    onClick={() => {
                                        onCheckout(
                                            customerName.trim(),
                                            customerPhone.trim(),
                                            notes.trim(),
                                        )
                                    }}
                                    className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#1E40AF] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {isSubmitting ? 'Enviando pedido…' : 'Confirmar pedido'}{' '}
                                    <span>${total.toLocaleString('es-MX')}</span>
                                </button>
                                {orderError && (
                                    <p
                                        role="alert"
                                        data-testid="order-error"
                                        className="mt-3 rounded-xl border border-[#F4C7C3] bg-[#FFF5F4] px-3 py-2.5 text-center text-xs font-semibold leading-5 text-[#B42318]"
                                    >
                                        {orderError}
                                    </p>
                                )}
                                <p className="mt-2 text-center text-[11px] leading-4 text-[#8996A9]">
                                    El teléfono se usará para identificar y contactar tu pedido.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </>
    )
}
