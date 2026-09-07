'use client'

import type { DateRange } from '../dashboard-data/dashboardData.types'

const options: { value: DateRange; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'seven-days', label: '7 días' },
    { value: 'thirty-days', label: '30 días' },
    { value: 'month', label: 'Este mes' },
]

type DateRangeFilterProps = { value: DateRange; onChange: (value: DateRange) => void }

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    return (
        <div className="flex w-full overflow-x-auto rounded-xl border border-[#C9D7EA] bg-white p-1 shadow-[0_8px_22px_rgb(20_48_105_/_0.08)] sm:w-auto" aria-label="Periodo de ventas" role="group">
            {options.map((option) => (
                <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5]/25 ${value === option.value ? 'bg-[#2451C5] text-white shadow-[0_6px_16px_rgb(36_81_197_/_0.2)]' : 'text-[#65738A] hover:bg-[#EAF0FF] hover:text-[#1E40AF]'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    )
}
