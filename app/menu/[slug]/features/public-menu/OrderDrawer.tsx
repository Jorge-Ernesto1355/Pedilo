'use client'

import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
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
}: OrderDrawerProps) {
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [cartPulseKey, setCartPulseKey] = useState(0)
    const previousTotalItems = useRef(totalItems)
    const dialogRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const onCloseRef = useRef(onClose)
    const reducedMotion = useReducedMotion()
    const phoneIsValid = isValidPhone(customerPhone)
    const shouldPulse = !reducedMotion && cartPulseKey > 0

    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        if (totalItems > previousTotalItems.current) {
            setCartPulseKey((current) => current + 1)
        }
        previousTotalItems.current = totalItems
    }, [totalItems])

    useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onCloseRef.current()
                return
            }

            if (event.key !== 'Tab' || !dialogRef.current) return
            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
                ),
            )
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        closeButtonRef.current?.focus({ preventScroll: true })

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
            previousFocus?.focus({ preventScroll: true })
        }
    }, [open])

    return (
        <>
            {totalItems > 0 && !open && (
                <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
                    <motion.button
                        type="button"
                        onClick={onOpen}
                        initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
                        animate={
                            shouldPulse
                                ? {
                                      opacity: 1,
                                      y: 0,
                                      scale: [1, 1.04, 0.99, 1],
                                      boxShadow: [
                                          '0 16px 36px rgb(30 64 175 / 0.28)',
                                          '0 19px 42px rgb(49 95 232 / 0.38)',
                                          '0 16px 36px rgb(30 64 175 / 0.28)',
                                      ],
                                  }
                                : { opacity: 1, y: 0, scale: 1 }
                        }
                        transition={
                            shouldPulse
                                ? { duration: reducedMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }
                                : {
                                      duration: reducedMotion ? 0 : 0.38,
                                      ease: [0.22, 1, 0.36, 1],
                                  }
                        }
                        className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl bg-[#1E40AF] px-4 py-3.5 text-left text-white shadow-[0_16px_36px_rgb(30_64_175_/_0.28)] transition-colors duration-200 hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25"
                    >
                        <span className="flex items-center gap-3">
                            <span
                                key={cartPulseKey}
                                className={`grid size-9 place-items-center rounded-xl bg-white/15 ${shouldPulse ? 'pedilo-cart-icon-pulse' : ''}`}
                            >
                                <ShoppingBag className="size-4" />
                            </span>
                            <span>
                                <span className="block text-sm font-bold">Ver mi pedido</span>
                                <span className="block text-xs text-white/70" aria-live="polite">
                                    <span
                                        key={cartPulseKey}
                                        className={shouldPulse ? 'pedilo-cart-count-pop inline-block' : undefined}
                                    >
                                        {totalItems}
                                    </span>{' '}
                                    {totalItems === 1 ? 'producto' : 'productos'}
                                </span>
                            </span>
                        </span>
                        <span className="text-sm font-bold">${total.toLocaleString('es-MX')}</span>
                    </motion.button>
                </div>
            )}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="order-drawer-overlay"
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-50 bg-[#10224A]/25"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) onClose()
                        }}
                    >
                    <motion.aside
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-title"
                        initial={reducedMotion ? false : { opacity: 0, x: '8%', scale: 0.985 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: '8%', scale: 0.985 }}
                        transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(100%,440px)] sm:rounded-none sm:rounded-l-[24px]"
                    >
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: reducedMotion ? 0 : 0.24, delay: reducedMotion ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
                            className="flex items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4 sm:px-6"
                        >
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
                                ref={closeButtonRef}
                                aria-label="Cerrar pedido"
                                className="grid size-9 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F5F8FC] hover:text-[#12234A]"
                            >
                                <X className="size-4" />
                            </button>
                        </motion.div>
                        <motion.div
                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: reducedMotion ? 0 : 0.24, delay: reducedMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-5 px-5 py-5 sm:px-6"
                        >
                            {lines.length > 0 ? (
                                <div className="space-y-4">
                                    {lines.map((line, index) => (
                                        <motion.div
                                            key={line.key}
                                            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{
                                                duration: reducedMotion ? 0 : 0.22,
                                                delay: reducedMotion ? 0 : index * 0.035,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                            className="flex gap-3"
                                        >
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
                                        </motion.div>
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
                                    placeholder="Ej. Jorge Pérez"
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
                                    placeholder="Ej. 698119319"
                                    inputMode="tel"
                                    className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                />
                                {customerPhone.length > 0 && !phoneIsValid && (
                                    <p className="mt-1.5 text-xs text-[#B42318]">
                                        Usa 9 o 10 números juntos, por ejemplo 698119319. No uses
                                        +52 ni guiones.
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
                        </motion.div>
                    </motion.aside>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
