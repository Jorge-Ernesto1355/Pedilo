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

const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
})

export function SalesChart({ data }: { data: SalesData }) {
    const chartData = data.points.map((point) => ({
        label: point.label,
        sales: point.sales,
    }))

    return (
        <div className="h-[260px] w-full" aria-label="Gráfica de ventas">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
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
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8996A9', fontSize: 11 }}
                        tickFormatter={(value: number) => `$${value}`}
                        width={48}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#fff',
                            border: '1px solid #DCE5F3',
                            borderRadius: 12,
                            color: '#12234A',
                            boxShadow: '0 10px 25px rgb(20 48 105 / .12)',
                        }}
                        labelStyle={{ color: '#65738A', marginBottom: 4 }}
                        formatter={(value) => [money.format(Number(value)), 'Ventas']}
                    />
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
