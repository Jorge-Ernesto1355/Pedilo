'use client'

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import type { SalesData } from '../dashboard-data/dashboardData.types'
import { formatMoney } from '../dashboard-data/formatters'

export function SalesChart({ data, currency = 'MXN' }: { data: SalesData; currency?: string }) {
    const labelInterval = data.points.length > 14 ? Math.ceil(data.points.length / 10) - 1 : 0

    return (
        <div
            className="h-[260px] w-full min-w-0"
            aria-label={`Gráfica de ventas por ${data.granularity === 'hour' ? 'hora' : 'día'}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.points} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4E7BFF" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#4E7BFF" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#DCE5F3" strokeOpacity={0.8} vertical={false} />
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8996A9', fontSize: 11 }}
                        interval={labelInterval}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8996A9', fontSize: 11 }}
                        tickFormatter={(value: number) => formatMoney(value, currency)}
                        width={48}
                    />
                    <Tooltip content={<SalesTooltip currency={currency} />} />
                    <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#2451C5"
                        strokeWidth={2.5}
                        fill="url(#sales-fill)"
                        activeDot={{ r: 5, fill: '#fff', stroke: '#2451C5', strokeWidth: 3 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

function SalesTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ payload?: { sales?: number; orderCount?: number } }>; label?: string; currency: string }) {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    return (
        <div className="rounded-xl border border-[#DCE5F3] bg-white px-3 py-2.5 text-sm text-[#12234A] shadow-[0_10px_25px_rgb(20_48_105_/_0.12)]">
            <p className="mb-2 font-semibold text-[#65738A]">{label}</p>
            <p><span className="text-[#65738A]">Ventas</span> <strong>{formatMoney(point?.sales ?? 0, currency)}</strong></p>
            <p><span className="text-[#65738A]">Órdenes</span> <strong>{point?.orderCount ?? 0}</strong></p>
        </div>
    )
}
