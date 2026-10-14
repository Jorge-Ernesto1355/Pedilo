'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight, CircleHelp, Receipt, Minus } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AverageTicketResponse } from '../dashboard-data/dashboardData.types'
import { formatMoney } from '../dashboard-data/formatters'
import { DashboardCardError } from '../../components/DashboardCardError'
import CountUp from './CountUp'

export function AverageTicketKpiCard({
    data,
    currency,
    isLoading = false,
    isError = false,
    onRetry,
}: {
    data?: AverageTicketResponse['data']
    currency?: string
    isLoading?: boolean
    isError?: boolean
    onRetry?: () => void
}) {
    const [infoOpen, setInfoOpen] = useState(false)
    if (isError) {
        return (
            <AverageTicketCardShell>
                <TicketHeader />
                <DashboardCardError
                    title="Ticket promedio no disponible"
                    description="No pudimos consultar este indicador. Las demás métricas siguen disponibles."
                    onRetry={onRetry}
                />
            </AverageTicketCardShell>
        )
    }

    if (isLoading || !data) {
        return (
            <AverageTicketCardShell>
                <TicketHeader />
                <p className="mt-8 h-9 w-36 animate-pulse rounded-lg bg-[#EEF2F7]" />
            </AverageTicketCardShell>
        )
    }

    const comparison = data.comparison
    // has_previous_data only indicates whether the previous period had orders.
    // A percentage is still meaningful when the previous average is zero.
    const isUp = comparison.direction === 'up'
    const isDown = comparison.direction === 'down'
    const tone = isUp
        ? { text: 'text-[#23814C]', bg: 'bg-[#EAF7EF]' }
        : isDown
          ? { text: 'text-[#B54747]', bg: 'bg-[#FDECEC]' }
          : { text: 'text-[#65738A]', bg: 'bg-[#EEF2F7]' }
    const ComparisonIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus
    const currentTicketValue = parseAmount(data.current.average_ticket)
    const globalTicketValue = parseAmount(data.global?.average_ticket)
    const previousTickerAverage = parseAmount(data.previous?.average_ticket)
    const percentage = comparison.percentage_change

    console.log(previousTickerAverage)

    return (
        <AverageTicketCardShell>
            <TicketHeader>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            type="button"
                            aria-label="Cómo se mide el ticket promedio"
                            aria-expanded={infoOpen}
                            onClick={() => setInfoOpen((open) => !open)}
                            className="grid size-8 place-items-center rounded-full text-[#65738A] transition hover:bg-[#EEF2F7] hover:text-[#2451C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2451C5]"
                        >
                            <CircleHelp className="size-5" aria-hidden="true" />
                        </button>
                        {infoOpen ? (
                            <div className="absolute right-0 top-10 z-10 w-72 rounded-xl border border-[#C9D7EA] bg-white p-4 text-left text-xs leading-5 text-[#65738A] shadow-[0_12px_28px_rgb(20_48_105_/_0.14)]">
                                <p className="font-semibold text-[#12234A]">
                                    ¿Cómo se mide el ticket promedio?
                                </p>
                                <p className="mt-2">
                                    Es el promedio que representa cada pedido: ventas totales ÷
                                    pedidos válidos del periodo.
                                </p>
                                <p className="mt-2">
                                    Solo considera pedidos PREPARING y READY. Los pedidos cancelados
                                    quedan fuera.
                                </p>
                            </div>
                        ) : null}
                    </div>
                    <Link
                        href="/dashboard/sales"
                        className="text-[#8996A9] transition hover:text-[#2451C5]"
                        aria-label="Ver detalle de ventas"
                    >
                        <ArrowUpRight className="size-4" />
                    </Link>
                </div>
            </TicketHeader>
            <p className="mt-6 text-sm text-[#65738A]">Ticket promedio del periodo</p>
            <p className="mt-1 font-display text-3xl tracking-[-.05em] text-[#12234A]">
                {currentTicketValue !== null && Number.isFinite(currentTicketValue) ? (
                    <CountUp
                        to={currentTicketValue}
                        formatValue={(value) => formatMoney(value, currency ?? data.currency)}
                        duration={0.45}
                    />
                ) : (
                    'Sin ventas'
                )}
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-[#EEF2F7] pt-4">
                <span
                    className={`grid size-7 place-items-center rounded-lg ${tone.bg} ${tone.text}`}
                >
                    <ComparisonIcon className="size-4" aria-hidden="true" />
                </span>
                {percentage === null ? (
                    <span className="text-xs font-semibold text-[#65738A]">
                        Sin periodo anterior comparable
                    </span>
                ) : (
                    <span className={`text-sm font-semibold ${tone.text}`}>
                        {percentage > 0 ? '+' : ''}
                        {percentage}% contra el periodo anterior
                        {previousTickerAverage !== null
                            ? ` · ${formatMoney(previousTickerAverage, currency ?? data.currency)}`
                            : ''}
                    </span>
                )}
            </div>
            <div className="mt-5 border-t border-[#EEF2F7] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#8996A9]">
                    Promedio histórico
                </p>
                <p className="mt-1 text-sm text-[#65738A]">De todo tu negocio</p>
                <p className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]">
                    {globalTicketValue !== null && Number.isFinite(globalTicketValue) ? (
                        <CountUp
                            to={globalTicketValue}
                            formatValue={(value) => formatMoney(value, currency ?? data.currency)}
                            duration={0.45}
                        />
                    ) : data.global ? (
                        'Sin ventas'
                    ) : (
                        'No disponible'
                    )}
                </p>
            </div>
        </AverageTicketCardShell>
    )
}

function parseAmount(value: string | null | undefined) {
    if (value === null || value === undefined || value.trim() === '') return null

    const amount = Number(value)
    return Number.isFinite(amount) ? amount : null
}

function AverageTicketCardShell({ children }: { children: ReactNode }) {
    return (
        <article className="relative h-full rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
            {children}
        </article>
    )
}

function TicketHeader({ children }: { children?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="grid size-10 place-items-center rounded-xl bg-[#FFF6DF] text-[#A46B00]">
                <Receipt className="size-5" aria-hidden="true" />
            </span>
            {children ?? (
                <span className="text-xs font-semibold text-[#8996A9]">Ticket promedio</span>
            )}
        </div>
    )
}
