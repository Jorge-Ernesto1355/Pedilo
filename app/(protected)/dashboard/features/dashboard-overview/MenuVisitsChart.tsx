'use client'

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { formatCount, formatSeriesLabel } from './menuVisitsFormat'
import type { StoreVisitSeriesGranularity, StoreVisitSeriesPoint } from './storeVisitsStats'

type ChartInterval = {
    label: string
    previousLabel: string | null
    currentVisits: number
    previousVisits: number
}

// Se carga con lazy() desde MenuVisitsCard para mantener recharts fuera del JS inicial.
export default function MenuVisitsChart({
    current,
    previous,
    granularity,
}: {
    current: StoreVisitSeriesPoint[]
    previous: StoreVisitSeriesPoint[]
    granularity: StoreVisitSeriesGranularity
}) {
    const intervals = buildChartIntervals(current, previous)

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={intervals} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="#E9EEF5" />
                <XAxis
                    dataKey="label"
                    tickFormatter={(label: string) => formatSeriesLabel(label, granularity, true)}
                    tick={{ fill: '#8792A3', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#8792A3', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                />
                <Tooltip content={<VisitsTooltip granularity={granularity} />} />
                <Line
                    type="monotone"
                    dataKey="currentVisits"
                    name="Este periodo"
                    stroke="#34714B"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#34714B', strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                />
                <Line
                    type="monotone"
                    dataKey="previousVisits"
                    name="Periodo anterior"
                    stroke="#AAB5C6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: '#AAB5C6', strokeWidth: 0 }}
                    activeDot={{ r: 3.5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    )
}

function VisitsTooltip({
    active,
    payload,
    granularity,
}: {
    active?: boolean
    payload?: Array<{ payload?: ChartInterval }>
    granularity: StoreVisitSeriesGranularity
}) {
    if (!active || !payload?.length) return null
    const interval = payload[0]?.payload
    if (!interval) return null

    return (
        <div className="rounded-lg border border-[#DCE5F3] bg-white px-3 py-2 shadow-lg">
            <p className="text-[11px] font-semibold text-[#243556]">
                {formatSeriesLabel(interval.label, granularity, false)}
            </p>
            <p className="mt-1 text-[11px] text-[#34714B]">
                Este periodo: {formatCount(interval.currentVisits)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#65738A]">
                Periodo anterior
                {interval.previousLabel
                    ? ` · ${formatSeriesLabel(interval.previousLabel, granularity, false)}`
                    : ''}
                : {formatCount(interval.previousVisits)}
            </p>
        </div>
    )
}

function buildChartIntervals(
    current: StoreVisitSeriesPoint[],
    previous: StoreVisitSeriesPoint[],
): ChartInterval[] {
    const length = Math.max(current.length, previous.length)
    return Array.from({ length }, (_, index) => ({
        label: current[index]?.label ?? previous[index]?.label ?? '',
        previousLabel: previous[index]?.label ?? null,
        currentVisits: current[index]?.visits ?? 0,
        previousVisits: previous[index]?.visits ?? 0,
    }))
}
