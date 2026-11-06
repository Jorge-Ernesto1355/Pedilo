'use client'

import { Minus, Pencil, Plus, ShoppingBag, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { CartLine } from './types'
import type { CustomerDiscount, OrderFulfillmentType, OrderPaymentMethod } from '@/src/lib/api/order-types'
import { getCheckoutCustomerDiscount } from '@/src/lib/api/customerDiscountApi'
import { Gift, LoaderCircle } from 'lucide-react'
import { hasAvailableOptions } from './optionGroupValidation'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'

const PUBLIC_ORDER_TEXT_MAX_LENGTH = 200
const PUBLIC_CUSTOMER_NAME_MAX_LENGTH = 20

function originalUnitPrice(line: CartLine) {
    const original = line.product.priceOriginal ?? line.product.price_original ?? line.product.price
    const final = line.product.priceFinal ?? line.product.price_final ?? line.product.price
    return line.unitPrice + Math.max(0, original - final)
}

function cartDiscountSavings(lines: CartLine[]) {
    return lines.reduce((total, line) => total + Math.max(0, originalUnitPrice(line) - line.unitPrice) * line.quantity, 0)
}

type OrderDrawerProps = {
    lines: CartLine[]
    totalItems: number
    total: number
    open: boolean
    businessName: string
    businessId: string
    paymentCardAvailable?: boolean
    onChangeQuantity: (key: string, delta: number) => void
    onEditLine: (line: CartLine) => void
    onOpen: () => void
    onClose: () => void
    onCheckout: (
        customerName: string,
        customerPhone: string,
        notes: string,
        fulfillmentType: OrderFulfillmentType,
        ignoreCustomerDiscount?: boolean,
        acceptPriceChange?: boolean,
        paymentMethod?: OrderPaymentMethod,
    ) => void
    isSubmitting?: boolean
    phoneError?: string | null
    orderError?: string | null
    couponApplicationError?: boolean
    priceChange?: { expectedSubtotal: number; currentSubtotal: number; difference: number } | null
    onCancelPriceChange?: () => void
}

export function OrderDrawer({
    lines,
    totalItems,
    total,
    open,
    businessName,
    businessId,
    paymentCardAvailable = false,
    onChangeQuantity,
    onEditLine,
    onOpen,
    onClose,
    onCheckout,
    isSubmitting = false,
    phoneError,
    orderError,
    couponApplicationError = false,
    priceChange = null,
    onCancelPriceChange,
}: OrderDrawerProps) {
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [fulfillmentType, setFulfillmentType] = useState<OrderFulfillmentType>('DINE_IN')
    const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>('CASH')
    const [cartPulseKey, setCartPulseKey] = useState(0)
    const previousTotalItems = useRef(totalItems)
    const dialogRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const onCloseRef = useRef(onClose)
    const reducedMotion = useReducedMotion()
    const phoneIsValid = isValidPhone(customerPhone)
    const shouldPulse = !reducedMotion && cartPulseKey > 0
    const [lookupPhone, setLookupPhone] = useState('')
    const [discountInvalidated, setDiscountInvalidated] = useState(false)
    const knownDiscountRef = useRef<CustomerDiscount | null>(null)
    const hasProductDiscount = lines.some((line) => line.product.discount && originalUnitPrice(line) > line.unitPrice)

    useEffect(() => {
        if (!open || !phoneIsValid || customerPhone.length !== 10) {
            return
        }
        const timer = window.setTimeout(() => setLookupPhone(customerPhone), 350)
        return () => window.clearTimeout(timer)
    }, [customerPhone, open, phoneIsValid])

    const discountQuery = useQuery({
        queryKey: ['checkout-customer-discount', businessId, lookupPhone],
        queryFn: () => getCheckoutCustomerDiscount(businessId, lookupPhone),
        enabled: Boolean(open && businessId && lookupPhone && lookupPhone === customerPhone),
        retry: false,
        staleTime: 0,
        refetchOnMount: 'always',
    })
    const customerDiscount =
        lookupPhone === customerPhone && !discountQuery.isFetching && discountQuery.data?.status === 'AVAILABLE'
            ? discountQuery.data
            : null
    const availableDiscount = hasProductDiscount ? null : customerDiscount
    useEffect(() => {
        if (availableDiscount) {
            knownDiscountRef.current = availableDiscount
        }
    }, [availableDiscount])

    const productSubtotal = lines.reduce(
        (subtotal, line) => subtotal + originalUnitPrice(line) * line.quantity,
        0,
    )
    const productSavings = cartDiscountSavings(lines)
    const checkoutSubtotal = productSubtotal
    const checkoutProductSavings = productSavings
    const checkoutTotalBeforeCustomerDiscount = Math.max(0, productSubtotal - productSavings)
    const previewDiscountAmount = availableDiscount
        ? Math.min(
              checkoutTotalBeforeCustomerDiscount,
              Math.round(
                  (availableDiscount.type === 'PERCENTAGE'
                      ? (checkoutTotalBeforeCustomerDiscount * availableDiscount.value) / 100
                      : availableDiscount.value) * 100,
              ) / 100,
          )
        : 0
    const previewTotal = Math.max(0, checkoutTotalBeforeCustomerDiscount - previewDiscountAmount)

    async function handleCheckout() {
        const knownDiscount = knownDiscountRef.current
        if (knownDiscount && lookupPhone === customerPhone && !hasProductDiscount) {
            const refreshed = await discountQuery.refetch()
            const currentDiscount = refreshed.data
            if (!currentDiscount || currentDiscount.status !== 'AVAILABLE') {
                setDiscountInvalidated(true)
                return
            }
        }
        onCheckout(customerName.trim(), customerPhone.trim(), notes.trim(), fulfillmentType, false, false, paymentMethod)
    }

    function resetDiscountValidation() {
        setDiscountInvalidated(false)
        knownDiscountRef.current = null
        setLookupPhone('')
    }

    function closeDrawer() {
        resetDiscountValidation()
        onClose()
    }

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
        const previousFocus =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                resetDiscountValidation()
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
                                        className={
                                            shouldPulse
                                                ? 'pedilo-cart-count-pop inline-block'
                                                : undefined
                                        }
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
                        transition={{
                            duration: reducedMotion ? 0 : 0.32,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="fixed inset-0 z-50 bg-[#10224A]/25"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) closeDrawer()
                        }}
                    >
                        <motion.aside
                            ref={dialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="order-title"
                            initial={reducedMotion ? false : { opacity: 0, x: '8%', scale: 0.985 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={
                                reducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, x: '8%', scale: 0.985 }
                            }
                            transition={{
                                duration: reducedMotion ? 0 : 0.38,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(100%,440px)] sm:rounded-none sm:rounded-l-[24px]"
                        >
                            <motion.div
                                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{
                                    duration: reducedMotion ? 0 : 0.24,
                                    delay: reducedMotion ? 0 : 0.06,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
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
                                    onClick={closeDrawer}
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
                                transition={{
                                    duration: reducedMotion ? 0 : 0.24,
                                    delay: reducedMotion ? 0 : 0.1,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="space-y-5 px-5 py-5 sm:px-6"
                            >
                                {lines.length > 0 ? (
                                    <div className="space-y-4">
                                        {lines.map((line, index) => (
                                            <motion.div
                                                key={line.key}
                                                initial={
                                                    reducedMotion ? false : { opacity: 0, y: 8 }
                                                }
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                                transition={{
                                                    duration: reducedMotion ? 0 : 0.22,
                                                    delay: reducedMotion ? 0 : index * 0.035,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="max-w-full truncate text-sm font-bold text-[#243556]"
                                                        title={line.product.name}
                                                    >
                                                        {line.product.name}
                                                    </p>
                                                    {line.product.includedProducts &&
                                                        line.product.includedProducts.length >
                                                            0 && (
                                                            <p className="mt-0.5 max-w-full whitespace-normal break-words text-xs leading-5 text-[#65738A] [overflow-wrap:anywhere]">
                                                                Incluye:{' '}
                                                                {line.product.includedProducts
                                                                    .map((item) => `${item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ''}${item.product.name}`)
                                                                    .join(', ')}
                                                            </p>
                                                        )}
                                                    {line.selections.length > 0 ? (
                                                        <p className="mt-0.5 max-w-full whitespace-normal break-words text-xs leading-5 text-[#65738A] [overflow-wrap:anywhere]">
                                                            {line.selections
                                                                .map(
                                                                    (selection) =>
                                                                        `${selection.name}${selection.quantity > 1 ? ` ×${selection.quantity}` : ''}${selection.kind === 'combo-choice' ? '' : ` · +$${(selection.price * selection.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}`,
                                                                )
                                                                .join(', ')}
                                                        </p>
                                                    ) : (
                                                        hasAvailableOptions(line.product) && (
                                                            <p className="mt-0.5 text-xs text-[#2451C5]">
                                                                Personalizable · sin opciones
                                                            </p>
                                                        )
                                                    )}
                                                    <p className="mt-1 max-w-full whitespace-normal break-words text-xs font-semibold text-[#2451C5] [overflow-wrap:anywhere]">
                                                        {line.product.discount && originalUnitPrice(line) > line.unitPrice && <span className="mr-1 text-[#8996A9] line-through">${originalUnitPrice(line).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
                                                        <span className={line.product.discount ? 'text-[#16803D]' : undefined}>${line.unitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u</span>
                                                        {line.product.discount && <span className="ml-1 text-[11px] font-bold text-[#16803D]">{line.product.discount.label}</span>}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2 self-start">
                                                    {hasAvailableOptions(line.product) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onEditLine(line)}
                                                            className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#2451C5] hover:bg-[#EAF0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]/30"
                                                        >
                                                            <Pencil
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            Editar
                                                        </button>
                                                    )}
                                                    <div className="flex h-11 items-center gap-1 rounded-lg border border-[#DCE5F3] px-1 sm:h-8 sm:gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onChangeQuantity(line.key, -1)
                                                            }
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
                                                            onClick={() =>
                                                                onChangeQuantity(line.key, 1)
                                                            }
                                                            aria-label={`Agregar una unidad de ${line.product.name}`}
                                                            className="grid size-10 place-items-center rounded text-[#2451C5] hover:bg-[#EAF0FF] sm:size-6"
                                                        >
                                                            <Plus className="size-3" />
                                                        </button>
                                                    </div>
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
                                    <fieldset>
                                        <legend className="mb-2 block text-sm font-bold text-[#243556]">
                                            ¿Cómo recibirás tu pedido?
                                        </legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(
                                                [
                                                    ['DINE_IN', 'Comer aquí'],
                                                    ['PICKUP', 'Para llevar / recoger'],
                                                ] as const
                                            ).map(([value, label]) => (
                                                <label
                                                    key={value}
                                                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${fulfillmentType === value ? 'border-[#2451C5] bg-[#F2F6FF] text-[#1E40AF]' : 'border-[#D7E1EF] text-[#53647D]'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="fulfillmentType"
                                                        value={value}
                                                        checked={fulfillmentType === value}
                                                        onChange={() => setFulfillmentType(value)}
                                                        className="accent-[#2451C5]"
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                    {paymentCardAvailable && (
                                        <fieldset className="mt-5" data-cy="payment-method-selector">
                                            <legend className="mb-2 block text-sm font-bold text-[#243556]">Método de pago</legend>
                                            <div className="grid grid-cols-2 gap-2">
                                                {([['CASH', 'Efectivo'], ['TRANSFER', 'Transferencia']] as const).map(([value, label]) => (
                                                    <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${paymentMethod === value ? 'border-[#2451C5] bg-[#F2F6FF] text-[#1E40AF]' : 'border-[#D7E1EF] text-[#53647D]'}`}>
                                                        <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="accent-[#2451C5]" data-cy={`payment-method-${value.toLowerCase()}`} />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    )}
                                    <label
                                        htmlFor="customer-name"
                                        className="mb-2 mt-5 block text-sm font-bold text-[#243556]"
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
                                        maxLength={PUBLIC_CUSTOMER_NAME_MAX_LENGTH}
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
                                        onChange={(event) => {
                                            resetDiscountValidation()
                                            setCustomerPhone(sanitizePhoneInput(event.target.value))
                                        }}
                                        placeholder="Ej. 698119319"
                                        inputMode="tel"
                                        className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                    />
                                    {customerPhone.length > 0 && !phoneIsValid && (
                                        <p className="mt-1.5 text-xs text-[#B42318]">
                                            Usa 9 o 10 números juntos, por ejemplo 698119319. No
                                            uses +52 ni guiones.
                                        </p>
                                    )}
                                    {phoneError && (
                                        <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                                            {phoneError}
                                        </p>
                                    )}
                                    {open && hasProductDiscount && customerDiscount && isValidPhone(customerPhone) && customerPhone.length === 10 && (
                                        <p className="mt-2 text-xs leading-5 text-[#65738A]" role="status" data-testid="customer-discount-unavailable-with-product-discount">
                                            Este cupón no se puede combinar con descuentos de productos.
                                        </p>
                                    )}
                                    {open &&
                                        isValidPhone(customerPhone) &&
                                        customerPhone.length === 10 &&
                                        (lookupPhone !== customerPhone || discountQuery.isFetching) && (
                                            <p
                                                className="mt-2 flex items-center gap-1.5 text-xs text-[#65738A]"
                                                role="status"
                                            >
                                                <LoaderCircle
                                                    className="size-3.5 animate-spin"
                                                    aria-hidden="true"
                                                />
                                                Revisando si tienes un descuento…
                                            </p>
                                        )}
                                    {discountInvalidated && (
                                        <div
                                            className="mt-3 rounded-xl border border-[#F4C7C3] bg-[#FFF5F4] p-3"
                                            role="alert"
                                            data-testid="discount-invalidated"
                                        >
                                            <p className="text-sm font-bold text-[#B42318]">
                                                Cupón invalidado
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[#8F2B24]">
                                                Este cupón ya no está disponible y no se te restará
                                                ningún importe de tu pedido. Puede haberse usado,
                                                vencido o revocado.
                                            </p>
                                        </div>
                                    )}
                                    {!discountInvalidated && availableDiscount && (
                                        <div className="mt-3 rounded-xl border border-[#B8E2C8] bg-[#F3FAF5] p-3">
                                            <p className="flex items-center gap-2 text-sm font-bold text-[#205E3E]">
                                                <Gift
                                                    className="size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                ¡Tienes un descuento!
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[#53647D]">
                                                {availableDiscount.type === 'PERCENTAGE'
                                                    ? `${availableDiscount.value}% de descuento`
                                                    : `$${availableDiscount.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de descuento`}{' '}
                                                en este restaurante. Se aplicará automáticamente.
                                            </p>
                                            {availableDiscount.expiresAt && (
                                                <p className="mt-1 text-[11px] text-[#71819A]">
                                                    Válido hasta{' '}
                                                    {new Date(
                                                        availableDiscount.expiresAt,
                                                    ).toLocaleDateString('es-MX', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {lookupPhone === customerPhone && discountQuery.isError && (
                                        <p
                                            className="mt-2 text-xs leading-5 text-[#65738A]"
                                            role="status"
                                        >
                                            Revisaremos el descuento al confirmar tu pedido.
                                        </p>
                                    )}
                                    <label
                                        htmlFor="order-notes"
                                        className="mb-2 mt-3 block text-sm font-bold text-[#243556]"
                                    >
                                        Notas{' '}
                                        <span className="font-normal text-[#8996A9]">
                                            (opcional)
                                        </span>
                                    </label>
                                    <textarea
                                        id="order-notes"
                                        name="notes"
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        placeholder="Ej. Sin cebolla"
                                        maxLength={PUBLIC_ORDER_TEXT_MAX_LENGTH}
                                        aria-describedby="order-notes-counter"
                                        rows={2}
                                        className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                                    />
                                    <span
                                        id="order-notes-counter"
                                        className={`mt-1 flex justify-between text-[11px] font-normal ${notes.length >= PUBLIC_ORDER_TEXT_MAX_LENGTH - 20 ? 'text-[#B42318]' : 'text-[#8996A9]'}`}
                                    >
                                        <span>
                                            Máximo {PUBLIC_ORDER_TEXT_MAX_LENGTH} caracteres
                                        </span>
                                        <span className="font-semibold">
                                            {notes.length}/{PUBLIC_ORDER_TEXT_MAX_LENGTH}
                                        </span>
                                    </span>
                                    <p className="mt-3 rounded-xl bg-[#F5F8FC] px-3 py-2.5 text-xs leading-5 text-[#65738A]">
                                        Al confirmar, estos datos y el detalle de tu pedido se
                                        compartirán con{' '}
                                        <strong className="font-semibold text-[#243556]">
                                            {businessName}
                                        </strong>{' '}
                                        para que pueda revisarlo y responderte por WhatsApp. Pedilo
                                        es la plataforma tecnológica y no realiza el reparto.
                                        Consulta el{' '}
                                        <Link
                                            href="/privacidad"
                                            className="font-semibold text-[#2451C5] underline underline-offset-2"
                                        >
                                            Aviso de Privacidad
                                        </Link>
                                        .
                                    </p>
                                    <div data-cy="checkout-summary" className="mt-3 rounded-xl border border-[#E8EEF6] bg-white px-3.5 py-3">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-[#65738A]">Subtotal</span>
                                            <span data-cy="checkout-subtotal" className="font-medium text-[#243556]">
                                                $
                                                {checkoutSubtotal.toLocaleString('es-MX', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                        {checkoutProductSavings > 0 && <div data-cy="checkout-product-savings" className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-[#23794A]">Ahorro en productos</span><span className="font-semibold text-[#23794A]">−${checkoutProductSavings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>}
                                        {!discountInvalidated &&
                                            availableDiscount &&
                                            previewDiscountAmount > 0 && (
                                                <div data-cy="checkout-customer-savings" className="mt-2 flex items-center justify-between gap-3 text-sm">
                                                    <span className="text-[#23794A]">
                                                        Tu descuento
                                                    </span>
                                                    <span className="font-semibold text-[#23794A]">
                                                        −$
                                                        {previewDiscountAmount.toLocaleString(
                                                            'es-MX',
                                                            {
                                                                minimumFractionDigits: 2,
                                                            },
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                                <div data-cy="checkout-total" className="mt-2 flex items-center justify-between gap-3 border-t border-[#E8EEF6] pt-2.5">
                                            <span className="text-sm font-bold text-[#243556]">
                                                Total
                                            </span>
                                            <span className="text-base font-bold text-[#12234A]">
                                                $
                                                {previewTotal.toLocaleString('es-MX', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={
                                            !customerName.trim() ||
                                            !customerPhone.trim() ||
                                            !phoneIsValid ||
                                            lines.length === 0 ||
                                            isSubmitting ||
                                            discountInvalidated
                                        }
                                        onClick={() => {
                                            void handleCheckout()
                                        }}
                                        data-cy="checkout-submit"
                                        className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#1E40AF] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {isSubmitting ? 'Enviando pedido…' : 'Confirmar pedido'}{' '}
                                        <span>
                                            $
                                            {previewTotal.toLocaleString('es-MX', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </button>
                                    {priceChange && (
                                        <div
                                            className="mt-3 rounded-xl border border-[#F1C46A] bg-[#FFF9E8] px-3 py-3 text-left"
                                            data-testid="price-change-warning"
                                        >
                                            <p className="text-sm font-bold text-[#8A5A00]">
                                                El precio cambió mientras hacías tu pedido
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[#8A5A00]">
                                                El subtotal ahora es $
                                                {priceChange.currentSubtotal.toLocaleString(
                                                    'es-MX',
                                                    { minimumFractionDigits: 2 },
                                                )}{' '}
                                                ({priceChange.difference > 0 ? 'subió' : 'bajó'} $
                                                {Math.abs(priceChange.difference).toLocaleString(
                                                    'es-MX',
                                                    { minimumFractionDigits: 2 },
                                                )}
                                                ). ¿Quieres continuar?
                                            </p>
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={onCancelPriceChange}
                                                    className="min-h-9 flex-1 rounded-lg border border-[#D7B35A] px-2 text-xs font-bold text-[#8A5A00]"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onCheckout(
                                                            customerName.trim(),
                                                            customerPhone.trim(),
                                                            notes.trim(),
                                                            fulfillmentType,
                                                            false,
                                                            true,
                                                        )
                                                    }
                                                    className="min-h-9 flex-1 rounded-lg bg-[#B77900] px-2 text-xs font-bold text-white"
                                                >
                                                    Continuar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {discountInvalidated && (
                                        <div
                                            className="mt-3 rounded-xl border border-[#F4C7C3] bg-[#FFF5F4] p-3"
                                            data-testid="discount-invalidated-confirmation"
                                        >
                                            <p className="text-sm font-bold text-[#8F2B24]">
                                                ¿Quieres continuar sin el cupón?
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-[#8F2B24]">
                                                El total volvió a su importe original porque el
                                                descuento ya no está disponible.
                                            </p>
                                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={closeDrawer}
                                                    className="min-h-10 flex-1 rounded-lg border border-[#E7A29C] px-3 py-2 text-sm font-bold text-[#8F2B24]"
                                                >
                                                    Cancelar pedido
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onCheckout(
                                                            customerName.trim(),
                                                            customerPhone.trim(),
                                                            notes.trim(),
                                                            fulfillmentType,
                                                        )
                                                    }
                                                    className="min-h-10 flex-1 rounded-lg bg-[#B42318] px-3 py-2 text-sm font-bold text-white"
                                                >
                                                    Continuar sin descuento
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {couponApplicationError && (
                                        <div
                                            className="mt-2 flex flex-wrap items-center justify-end gap-2"
                                            data-testid="coupon-application-error"
                                        >
                                            <p className="mr-auto text-xs font-bold text-[#B42318]">
                                                Error al aplicar el cupón
                                            </p>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCheckout()}
                                                    className="min-h-8 rounded-md border border-[#E7A29C] px-2.5 py-1 text-[11px] font-bold text-[#8F2B24]"
                                                >
                                                    Reintentar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onCheckout(
                                                            customerName.trim(),
                                                            customerPhone.trim(),
                                                            notes.trim(),
                                                            fulfillmentType,
                                                            true,
                                                        )
                                                    }
                                                    className="min-h-8 rounded-md bg-[#B42318] px-2.5 py-1 text-[11px] font-bold text-white"
                                                >
                                                    Sin cupón
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {orderError && (
                                        <div role="alert" data-testid="order-error" className="mt-3 rounded-xl border border-[#F4C7C3] bg-[#FFF5F4] px-3 py-2.5 text-center text-xs font-semibold leading-5 text-[#B42318]">
                                            <p>{orderError}</p>
                                            {orderError.includes('tarjeta para transferencias') && paymentMethod === 'TRANSFER' && <button type="button" data-cy="transfer-continue-cash" onClick={() => { setPaymentMethod('CASH'); onCheckout(customerName.trim(), customerPhone.trim(), notes.trim(), fulfillmentType, false, false, 'CASH') }} className="mt-2 rounded-lg bg-[#B42318] px-3 py-2 text-xs font-bold text-white">Continuar en efectivo</button>}
                                        </div>
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
