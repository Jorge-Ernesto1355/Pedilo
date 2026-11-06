'use client'

import { useState } from 'react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { Check, CircleDollarSign, Gift, LoaderCircle, Percent, RotateCw } from 'lucide-react'
import { formatMoney } from '../dashboard-data/formatters'
import type { CustomerDiscountType, Order } from '@/src/lib/api/order-types'
import { useGrantOrderCustomerDiscount, useOrderCustomerDiscount } from './useCustomerDiscount'
import { CustomerDiscountCreator } from './CustomerDiscountCreator'
import { useGrantCustomerDiscount } from '../customers/useCustomerDiscounts'

const PERCENT_PRESETS = [10, 15, 20]
const FIXED_PRESETS = [20, 50]

export function CustomerDiscountPanel({ order, currency, customerId, onCancel }: { order?: Order; currency: string; customerId?: string; onCancel?: () => void }) {
    const [isCreating, setIsCreating] = useState(false)
    const [type, setType] = useState<CustomerDiscountType>('PERCENTAGE')
    const [value, setValue] = useState('10')
    const [createdSuccessfully, setCreatedSuccessfully] = useState(false)
    const customerCreateDiscount = useGrantCustomerDiscount(customerId ?? '')
    const discountQuery = useOrderCustomerDiscount(order?.id ?? null)
    const createDiscount = useGrantOrderCustomerDiscount(order?.id ?? '')
    if (customerId) {
        return <CustomerDiscountCreator currency={currency} onCreate={async (input) => { const result = await customerCreateDiscount.mutateAsync(input); onCancel?.(); return result }} isPending={customerCreateDiscount.isPending} error={customerCreateDiscount.error} submitLabel="Asignar cupón" onCancel={onCancel} />
    }
    if (!order) return null
    const numericValue = Number(value)
    const maximum = type === 'PERCENTAGE' ? 100 : 10_000
    const isValidValue =
        value.trim() !== '' &&
        Number.isFinite(numericValue) &&
        numericValue > 0 &&
        numericValue <= maximum
    const displayValue =
        type === 'PERCENTAGE'
            ? `${numericValue || 0}% de descuento`
            : `${formatMoney(numericValue || 0, currency)} de descuento`
    const previewValue = isValidValue ? displayValue : 'Valor inválido'
    const discount = discountQuery.data
    const activeDiscount =
        discount && ['AVAILABLE', 'RESERVED'].includes(discount.status) ? discount : null

    async function submitDiscount(input?: { type: CustomerDiscountType; value: number }) {
        if ((!input && !isValidValue) || createDiscount.isPending) return
        try {
            await createDiscount.mutateAsync(input ?? { type, value: numericValue })
            setIsCreating(false)
            setCreatedSuccessfully(true)
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.code === 'CUSTOMER_DISCOUNT_ALREADY_ACTIVE'
            ) {
                void discountQuery.refetch()
            }
        }
    }

    if (isCreating && !activeDiscount) {
        return <section className="rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-4 sm:p-5"><h3 className="font-display text-lg text-[#12234A]">Haz que vuelva</h3><CustomerDiscountCreator currency={currency} onCreate={submitDiscount} isPending={createDiscount.isPending} error={createDiscount.error} onCancel={() => setIsCreating(false)} /></section>
    }

    return (
        <section className="rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                    <Gift className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg text-[#12234A]">Haz que vuelva</h3>
                    <p className="mt-1 text-sm leading-5 text-[#65738A]">
                        Ofrece un descuento para su próximo pedido.
                    </p>
                </div>
            </div>

            {!order.customerId || !order.customerPhone ? (
                <p className="mt-4 rounded-xl border border-[#E8EEF6] bg-white px-3.5 py-3 text-sm leading-5 text-[#65738A]">
                    Esta orden no tiene un cliente vinculado a un teléfono, así que no podemos
                    reservarle un descuento.
                </p>
            ) : discountQuery.isLoading ? (
                <div
                    className="mt-4 space-y-2 rounded-xl border border-[#E8EEF6] bg-white p-3.5"
                    role="status"
                    data-testid="customer-discount-skeleton"
                    aria-label="Cargando información del cupón"
                >
                    <div className="h-3 w-36 animate-pulse rounded-full bg-[#E8EEF6]" />
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#F1F5F8]" />
                    <span className="sr-only">Consultando descuentos disponibles…</span>
                </div>
            ) : discountQuery.isError ? (
                <div
                    className="mt-4 rounded-xl border border-[#F3C2BD] bg-white p-3.5"
                    role="alert"
                    data-testid="customer-discount-error"
                >
                    <p className="text-sm text-[#8F2B24]">
                        No pudimos cargar el cupón de esta orden correctamente.
                    </p>
                    <button
                        type="button"
                        onClick={() => void discountQuery.refetch()}
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#2451C5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]"
                    >
                        <RotateCw className="size-3.5" aria-hidden="true" />
                        Intentar de nuevo
                    </button>
                </div>
            ) : activeDiscount ? (
                <div className="mt-4 rounded-xl border border-[#B8E2C8] bg-white p-3.5">
                    <div className="flex items-start gap-2.5">
                        <Check
                            className="mt-0.5 size-4 shrink-0 text-[#23794A]"
                            aria-hidden="true"
                        />
                        <div>
                            <p className="text-sm font-bold text-[#205E3E]">
                                {createdSuccessfully
                                    ? 'Descuento creado correctamente'
                                    : 'Descuento pendiente'}
                            </p>
                            <p className="mt-1 text-sm text-[#53647D]">
                                {activeDiscount.type === 'PERCENTAGE'
                                    ? `${activeDiscount.value}% de descuento`
                                    : `${formatMoney(activeDiscount.value, currency)} de descuento`}{' '}
                                en su próximo pedido en este negocio.
                            </p>
                            {activeDiscount.expiresAt && (
                                <p className="mt-1 text-xs text-[#8996A9]">
                                    Vence el{' '}
                                    {new Date(activeDiscount.expiresAt).toLocaleDateString(
                                        'es-MX',
                                        {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        },
                                    )}
                                </p>
                            )}
                            {createDiscount.error instanceof ApiError &&
                                createDiscount.error.code ===
                                    'CUSTOMER_DISCOUNT_ALREADY_ACTIVE' && (
                                    <p className="mt-2 text-sm text-[#8F2B24]" role="alert">
                                        Este cliente ya tiene un descuento disponible para su
                                        próximo pedido.
                                    </p>
                                )}
                        </div>
                    </div>
                </div>
            ) : order.status === 'CANCELLED' ? (
                <p className="mt-4 rounded-xl border border-[#E8EEF6] bg-white px-3.5 py-3 text-sm text-[#65738A]">
                    No se pueden otorgar descuentos desde una orden cancelada.
                </p>
            ) : !isCreating ? (
                <button
                    type="button"
                    onClick={() => {
                        setType('PERCENTAGE')
                        setValue('10')
                        setIsCreating(true)
                    }}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#2438A8] px-4 text-sm font-semibold text-white transition hover:bg-[#1D2F91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2438A8] focus-visible:ring-offset-2"
                >
                    Crear descuento
                </button>
            ) : (
                <div className="mt-4 space-y-4 rounded-xl border border-[#E8EEF6] bg-white p-3.5 sm:p-4">
                    <div>
                        <p className="text-xs font-semibold text-[#53647D]">Tipo de descuento</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <DiscountTypeButton
                                selected={type === 'PERCENTAGE'}
                                icon={<Percent className="size-4" aria-hidden="true" />}
                                onClick={() => {
                                    setType('PERCENTAGE')
                                    setValue('10')
                                }}
                            >
                                Porcentaje
                            </DiscountTypeButton>
                            <DiscountTypeButton
                                selected={type === 'FIXED_AMOUNT'}
                                icon={<CircleDollarSign className="size-4" aria-hidden="true" />}
                                onClick={() => {
                                    setType('FIXED_AMOUNT')
                                    setValue('20')
                                }}
                            >
                                Cantidad fija
                            </DiscountTypeButton>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-[#53647D]">Elige un valor</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(type === 'PERCENTAGE' ? PERCENT_PRESETS : FIXED_PRESETS).map(
                                (preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        aria-pressed={value === String(preset)}
                                        onClick={() => setValue(String(preset))}
                                        className={`min-h-9 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5] ${value === String(preset) ? 'border-[#2451C5] bg-[#EEF3FF] text-[#2451C5]' : 'border-[#DCE5F3] text-[#53647D] hover:border-[#B9CDFD]'}`}
                                    >
                                        {type === 'PERCENTAGE'
                                            ? `${preset}%`
                                            : formatMoney(preset, currency)}
                                    </button>
                                ),
                            )}
                        </div>
                        <label className="mt-3 block text-xs font-semibold text-[#53647D]">
                            Valor personalizado
                            <span className="relative mt-1.5 block">
                                {type === 'FIXED_AMOUNT' && (
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8996A9]">
                                        $
                                    </span>
                                )}
                                <input
                                    type="text"
                                    maxLength={type === 'PERCENTAGE' ? 3 : undefined}
                                    inputMode="numeric"
                                    value={value}
                                    onChange={(event) => {
                                        const nextValue = event.target.value
                                        if (!/^-?\d*$/.test(nextValue)) return
                                        if (
                                            type === 'PERCENTAGE' &&
                                            nextValue.replace(/\D/g, '').length > 3
                                        ) {
                                            return
                                        }
                                        setValue(nextValue)
                                    }}
                                    aria-label={
                                        type === 'PERCENTAGE'
                                            ? 'Porcentaje personalizado'
                                            : 'Cantidad fija personalizada'
                                    }
                                    className={`h-10 w-full rounded-lg border border-[#D7E1EF] bg-white text-sm font-medium text-[#243556] outline-none focus:border-[#2451C5] focus:ring-2 focus:ring-[#2451C5]/15 ${type === 'FIXED_AMOUNT' ? 'pl-8 pr-3' : 'px-3'}`}
                                />
                                {type === 'PERCENTAGE' && (
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8996A9]">
                                        %
                                    </span>
                                )}
                            </span>
                            <span className="mt-1 block font-normal text-[#8996A9]">
                                Máximo{' '}
                                {type === 'PERCENTAGE' ? '100%' : formatMoney(maximum, currency)}.
                            </span>
                        </label>
                    </div>

                    {type === 'PERCENTAGE' && value.trim() !== '' && !isValidValue && (
                        <p className="rounded-lg border border-[#F3C2BD] bg-[#FFF5F4] px-3 py-2.5 text-sm leading-5 text-[#B42318]" role="alert">
                            El porcentaje debe ser mayor que 0% y no puede superar el 100%.
                        </p>
                    )}

                    <p className="rounded-lg bg-[#F5F8FC] px-3 py-2.5 text-sm leading-5 text-[#53647D]">
                        El cliente recibirá{' '}
                        <strong className="text-[#243556]">{previewValue}</strong> en su próximo
                        pedido en este negocio.
                    </p>

                    {createDiscount.isError && (
                        <p className="text-sm text-[#B42318]" role="alert">
                            {createDiscount.error instanceof ApiError &&
                            createDiscount.error.code === 'CUSTOMER_DISCOUNT_ALREADY_ACTIVE'
                                ? 'Este cliente ya tiene un descuento disponible para su próximo pedido.'
                                : 'No pudimos crear el descuento. Inténtalo de nuevo.'}
                        </p>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8EEF6] pt-3">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            disabled={createDiscount.isPending}
                            className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#65738A] hover:bg-[#F2F5FA] disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void submitDiscount()}
                            disabled={!isValidValue || createDiscount.isPending}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2438A8] px-4 text-sm font-semibold text-white transition hover:bg-[#1D2F91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2438A8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {createDiscount.isPending && (
                                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            )}
                            {createDiscount.isPending ? 'Creando…' : 'Crear descuento'}
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}

function DiscountTypeButton({
    selected,
    icon,
    onClick,
    children,
}: {
    selected: boolean
    icon: React.ReactNode
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5] ${selected ? 'border-[#2451C5] bg-[#EEF3FF] text-[#2451C5]' : 'border-[#DCE5F3] text-[#53647D] hover:border-[#B9CDFD]'}`}
        >
            {icon}
            {children}
        </button>
    )
}
