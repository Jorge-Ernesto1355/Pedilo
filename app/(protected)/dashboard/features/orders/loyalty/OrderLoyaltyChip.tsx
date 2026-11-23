'use client'

import { LoaderCircle, Stamp } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState, type FormEvent } from 'react'
import type { LoyaltyProgram } from '@/app/components/loyalty/loyaltyOwnerApi'
import type { Order } from '@/src/lib/api/order-types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'
import { isOrderFinished, type useStampOrder } from './useOrderLoyalty'

type StampMutation = ReturnType<typeof useStampOrder>

// Sello en miniatura: formas e íconos se descargan solo cuando hay un sello dado.
const OrderMiniStamp = dynamic(() => import('./OrderMiniStamp'), {
    ssr: false,
    loading: () => <span aria-hidden="true" className="size-5" />,
})

/**
 * Chip de lealtad de un pedido finalizado: "Dar sello" o "Sello dado 5/8".
 * En el detalle, si el pedido no tiene cliente, ofrece vincular uno para sellarlo.
 */
export function OrderLoyaltyChip({
    order,
    program,
    stamp,
    variant,
}: {
    order: Order
    program: LoyaltyProgram | undefined
    stamp: StampMutation
    variant: 'card' | 'detail'
}) {
    const [justStamped, setJustStamped] = useState(false)
    const [linking, setLinking] = useState(false)
    const [customer, setCustomer] = useState({ name: '', phone: '' })
    const [linkError, setLinkError] = useState('')
    if (!program || !isOrderFinished(order)) return null

    const pending = stamp.isPending && stamp.variables?.order.id === order.id
    const given = order.loyaltyStamp

    if (given) {
        return (
            <span
                data-cy="order-loyalty-stamped"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#B8E2C8] bg-[#F3FAF5] px-2.5 py-1 text-[11px] font-bold text-[#23794A]"
            >
                <OrderMiniStamp program={program} animate={justStamped} />
                {given.position > 0
                    ? `Sello dado ${given.position}/${program.stampsRequired}`
                    : 'Sello dado'}
            </span>
        )
    }

    if (order.customerId) {
        return (
            <button
                type="button"
                data-cy="order-loyalty-stamp"
                disabled={pending}
                aria-busy={pending}
                onClick={(event) => {
                    event.stopPropagation()
                    setJustStamped(true)
                    stamp.mutate({ order })
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#C9D7EA] bg-white px-3 py-1.5 text-xs font-bold text-[#1E40AF] transition hover:border-[#9EB3D8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 disabled:cursor-wait disabled:opacity-60 sm:min-h-9"
            >
                {pending ? (
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                    <Stamp className="size-3.5" aria-hidden="true" />
                )}
                Dar sello
            </button>
        )
    }

    if (variant !== 'detail') return null

    const submit = (event: FormEvent) => {
        event.preventDefault()
        if (!customer.name.trim()) return setLinkError('Escribe el nombre del cliente.')
        if (!isValidPhone(customer.phone)) return setLinkError('El teléfono debe tener 10 dígitos.')
        setLinkError('')
        setJustStamped(true)
        stamp.mutate({ order, customer: { name: customer.name.trim(), phone: customer.phone } })
    }

    return (
        <div
            data-cy="order-loyalty-link"
            className="rounded-xl border border-[#E1E8F3] bg-[#FBFCFE] p-3"
        >
            {linking ? (
                <form
                    onSubmit={submit}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                >
                    <label className="text-xs font-bold text-[#243556]">
                        Nombre
                        <input
                            data-cy="order-loyalty-link-name"
                            value={customer.name}
                            maxLength={20}
                            onChange={(event) =>
                                setCustomer((value) => ({ ...value, name: event.target.value }))
                            }
                            className="mt-1 min-h-11 w-full rounded-xl border border-[#D7E1EF] px-3 text-sm font-normal"
                        />
                    </label>
                    <label className="text-xs font-bold text-[#243556]">
                        Teléfono
                        <input
                            data-cy="order-loyalty-link-phone"
                            value={customer.phone}
                            inputMode="tel"
                            onChange={(event) =>
                                setCustomer((value) => ({
                                    ...value,
                                    phone: sanitizePhoneInput(event.target.value),
                                }))
                            }
                            className="mt-1 min-h-11 w-full rounded-xl border border-[#D7E1EF] px-3 text-sm font-normal"
                        />
                    </label>
                    <button
                        type="submit"
                        data-cy="order-loyalty-link-submit"
                        disabled={pending}
                        className="min-h-11 rounded-xl bg-[#1E40AF] px-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                        Vincular y sellar
                    </button>
                    {linkError ? (
                        <p
                            role="alert"
                            className="text-xs font-semibold text-[#B42318] sm:col-span-3"
                        >
                            {linkError}
                        </p>
                    ) : null}
                </form>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#53647D]">
                        Pedido sin cliente: vincula uno para darle su sello.
                    </p>
                    <button
                        type="button"
                        data-cy="order-loyalty-link-open"
                        onClick={() => setLinking(true)}
                        className="min-h-11 rounded-xl border border-[#C9D7EA] bg-white px-3 text-xs font-bold text-[#1E40AF]"
                    >
                        Vincular cliente
                    </button>
                </div>
            )}
        </div>
    )
}

/** Línea del premio de lealtad en el resumen del pedido. */
export function OrderLoyaltyDiscount({
    order,
    format,
}: {
    order: Order
    format: (value: number) => string
}) {
    if (!order.loyaltyDiscountAmount || order.loyaltyDiscountAmount <= 0 || !order.loyaltyReward)
        return null
    return (
        <span
            data-cy="order-loyalty-discount"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#C9D7EA] bg-[#F4F7FF] px-2.5 py-1 text-[11px] font-bold text-[#1E40AF]"
        >
            <Stamp className="size-3.5" aria-hidden="true" /> Premio de lealtad ·{' '}
            {order.loyaltyReward.label} · −{format(order.loyaltyDiscountAmount)}
            {!order.loyaltyReward.active ? ' (devuelto)' : ''}
        </span>
    )
}
