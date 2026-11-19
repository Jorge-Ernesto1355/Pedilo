'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '../dashboard-data/formatters'

export type MiniTrendPoint = {
    label: string
    current: number
    previous: number
    currentOrders: number
    previousOrders: number
    difference: number | string | null
    percentage: number | null
}

// Se carga con lazy() desde TrendKpiCard: recharts no bloquea el render de las tarjetas.
export default function MiniTrendLineChart({
    points,
    currency,
}: {
    points: MiniTrendPoint[]
    currency: string
}) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 3, right: 2, bottom: 1, left: 2 }}>
                <Tooltip
                    cursor={{ stroke: '#DCE5F3', strokeDasharray: '3 3' }}
                    content={<MiniTrendTooltip currency={currency} />}
                />
                <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#2451C5"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: '#fff', stroke: '#2451C5', strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="previous"
                    stroke="#A7B7CF"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    activeDot={{ r: 3, fill: '#fff', stroke: '#8996A9', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

function MiniTrendTooltip({
    active,
    payload,
    currency,
}: {
    active?: boolean
    currency: string
    payload?: Array<{ payload?: Partial<MiniTrendPoint> }>
}) {
    if (!active || !payload?.length || !payload[0]?.payload) return null
    const point = payload[0].payload

    const previous = point.previous ?? 0
    const difference = point.difference ?? (point.current ?? 0) - previous

    return (
        <div className="rounded-lg border border-[#DCE5F3] bg-white px-2 py-1.5 text-[10px] text-[#12234A] shadow-sm">
            <p className="font-semibold text-[#65738A]">{point.label}</p>
            <p>Actual: {formatMoney(point.current ?? 0, currency)}</p>
            <p>Anterior: {formatMoney(previous, currency)}</p>
            <p>Diferencia: {formatMoney(Number(difference) || 0, currency)}</p>
            <p>
                Pedidos: {point.currentOrders ?? 0} / {point.previousOrders ?? 0}
            </p>
            {point.percentage !== null && point.percentage !== undefined && previous !== 0 ? (
                <p>
                    Variación: {point.percentage > 0 ? '+' : ''}
                    {point.percentage}%
                </p>
            ) : null}
        </div>
    )
}
