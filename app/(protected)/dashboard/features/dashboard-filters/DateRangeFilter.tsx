'use client'

import type { DateRange } from '../dashboard-data/dashboardData.types'
import RubberSegment from './DateRangeFilterAnimate'

const options: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: 'thisMonth', label: 'Este mes' },
]

type DateRangeFilterProps = {
    value: DateRange
    onChange: (value: DateRange) => void
    label?: string
}

export function DateRangeFilter({
    value,
    onChange,
    label = 'Periodo de ventas',
}: DateRangeFilterProps) {
    return (
        <div
            className="flex w-full overflow-x-auto rounded-xl border border-[#C9D7EA] bg-white p-1 shadow-[0_8px_22px_rgb(20_48_105_/_0.08)] sm:w-auto"
            aria-label={label}
            role="group"
        >
            <RubberSegment
                items={options}
                value={value}
                onChange={(nextValue) => onChange(nextValue as DateRange)}
                trackColor="#FFFFFF"
                thumbColor="#2451C5"
                textColor="#65738A"
                activeTextColor="#FFFFFF"
                size="md"
                radius={12}
                inset={3}
                equalSlots
                stretch={100}
                squash={3}
                speed={1}
                glide={75}
                draggable
                disabled={false}
            />
        </div>
    )
}
