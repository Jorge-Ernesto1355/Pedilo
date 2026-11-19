'use client'

import type { ProductOption } from '@/app/(protected)/create-menu/features/option-management/option.types'

export function OptionList({ options }: { options: ProductOption[] }) {
    return (
        <ul className="space-y-1.5">
            {options.map((option) => (
                <li
                    key={option.id}
                    className={`flex items-center justify-between text-sm ${option.isAvailable ? 'text-[#243556]' : 'text-[#9AA5B5] line-through'}`}
                >
                    <span>{option.name}</span>
                    <span className="text-xs">
                        {Number(option.price) > 0
                            ? `+$${Number(option.price).toFixed(2)}`
                            : 'Sin costo'}
                    </span>
                </li>
            ))}
        </ul>
    )
}
