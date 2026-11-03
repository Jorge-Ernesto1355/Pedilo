'use client'

import { useState } from 'react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { CircleDollarSign, LoaderCircle, Percent } from 'lucide-react'
import { formatMoney } from '../dashboard-data/formatters'
import type { CustomerDiscountType } from '@/src/lib/api/order-types'

const PERCENT_PRESETS = [10, 15, 20]
const FIXED_PRESETS = [20, 50]

export function CustomerDiscountCreator({
    currency,
    onCreate,
    isPending,
    error,
    submitLabel = 'Crear descuento',
    onCancel,
}: {
    currency: string
    onCreate: (discount: { type: CustomerDiscountType; value: number }) => Promise<unknown>
    isPending: boolean
    error: unknown
    submitLabel?: string
    onCancel?: () => void
}) {
    const [type, setType] = useState<CustomerDiscountType>('PERCENTAGE')
    const [value, setValue] = useState('10')
    const numericValue = Number(value)
    const maximum = type === 'PERCENTAGE' ? 100 : 10_000
    const isValidValue = value.trim() !== '' && Number.isInteger(numericValue) && numericValue > 0 && numericValue <= maximum
    const displayValue = type === 'PERCENTAGE' ? `${numericValue || 0}% de descuento` : `${formatMoney(numericValue || 0, currency)} de descuento`
    const hasError = Boolean(error)

    async function submit() {
        if (!isValidValue || isPending) return
        await onCreate({ type, value: numericValue })
    }

    return (
        <div className="mt-4 space-y-4 rounded-xl border border-[#E8EEF6] bg-white p-3.5 sm:p-4">
            <div>
                <p className="text-xs font-semibold text-[#53647D]">Tipo de descuento</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <DiscountTypeButton selected={type === 'PERCENTAGE'} icon={<Percent className="size-4" aria-hidden="true" />} onClick={() => { setType('PERCENTAGE'); setValue('10') }}>Porcentaje</DiscountTypeButton>
                    <DiscountTypeButton selected={type === 'FIXED_AMOUNT'} icon={<CircleDollarSign className="size-4" aria-hidden="true" />} onClick={() => { setType('FIXED_AMOUNT'); setValue('20') }}>Cantidad fija</DiscountTypeButton>
                </div>
            </div>
            <div>
                <p className="text-xs font-semibold text-[#53647D]">Elige un valor</p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {(type === 'PERCENTAGE' ? PERCENT_PRESETS : FIXED_PRESETS).map((preset) => (
                        <button key={preset} type="button" aria-pressed={value === String(preset)} onClick={() => setValue(String(preset))} className={`min-h-9 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5] ${value === String(preset) ? 'border-[#2451C5] bg-[#EEF3FF] text-[#2451C5]' : 'border-[#DCE5F3] text-[#53647D] hover:border-[#B9CDFD]'}`}>
                            {type === 'PERCENTAGE' ? `${preset}%` : formatMoney(preset, currency)}
                        </button>
                    ))}
                </div>
                <label className="mt-3 block text-xs font-semibold text-[#53647D]">
                    Valor personalizado
                    <span className="relative mt-1.5 block">
                        {type === 'FIXED_AMOUNT' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8996A9]">$</span>}
                        <input type="text" maxLength={type === 'PERCENTAGE' ? 3 : undefined} inputMode="numeric" value={value} onChange={(event) => { const next = event.target.value; if (!/^-?\d*$/.test(next)) return; if (type === 'PERCENTAGE' && next.replace(/\D/g, '').length > 3) return; setValue(next) }} aria-label={type === 'PERCENTAGE' ? 'Porcentaje personalizado' : 'Cantidad fija personalizada'} className={`h-10 w-full rounded-lg border border-[#D7E1EF] bg-white text-sm font-medium text-[#243556] outline-none focus:border-[#2451C5] focus:ring-2 focus:ring-[#2451C5]/15 ${type === 'FIXED_AMOUNT' ? 'pl-8 pr-3' : 'px-3'}`} />
                        {type === 'PERCENTAGE' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8996A9]">%</span>}
                    </span>
                    <span className="mt-1 block font-normal text-[#8996A9]">Máximo {type === 'PERCENTAGE' ? '100%' : formatMoney(maximum, currency)}.</span>
                </label>
            </div>
            {type === 'PERCENTAGE' && value.trim() !== '' && !isValidValue && <p className="rounded-lg border border-[#F3C2BD] bg-[#FFF5F4] px-3 py-2.5 text-sm leading-5 text-[#B42318]" role="alert">El porcentaje debe ser mayor que 0% y no puede superar el 100%.</p>}
            <p className="rounded-lg bg-[#F5F8FC] px-3 py-2.5 text-sm leading-5 text-[#53647D]">El cliente recibirá <strong className="text-[#243556]">{isValidValue ? displayValue : 'Valor inválido'}</strong> en su próximo pedido en este negocio.</p>
            {hasError && <p className="text-sm text-[#B42318]" role="alert">{error instanceof ApiError && error.code === 'CUSTOMER_DISCOUNT_ALREADY_ACTIVE' ? 'Este cliente ya tiene un descuento disponible para su próximo pedido.' : 'No pudimos crear el descuento. Inténtalo de nuevo.'}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8EEF6] pt-3">
                <button type="button" onClick={() => (onCancel ? onCancel() : setValue(''))} disabled={isPending} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#65738A] hover:bg-[#F2F5FA] disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={() => void submit()} disabled={!isValidValue || isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#2438A8] px-4 text-sm font-semibold text-white transition hover:bg-[#1D2F91] disabled:cursor-not-allowed disabled:opacity-50">{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{isPending ? 'Creando…' : submitLabel}</button>
            </div>
        </div>
    )
}

function DiscountTypeButton({ selected, icon, onClick, children }: { selected: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
    return <button type="button" aria-pressed={selected} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5] ${selected ? 'border-[#2451C5] bg-[#EEF3FF] text-[#2451C5]' : 'border-[#DCE5F3] text-[#53647D] hover:border-[#B9CDFD]'}`}>{icon}{children}</button>
}
