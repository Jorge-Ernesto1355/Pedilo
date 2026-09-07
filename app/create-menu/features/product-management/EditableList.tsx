'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'

export type EditableListItem = { id: string; name: string; price?: string }

type EditableListProps = {
    items: EditableListItem[]
    placeholder: string
    addLabel: string
    showPrice?: boolean
    onAdd: () => void
    onRemove: (index: number) => void
    onChange: (index: number, key: 'name' | 'price', value: string) => void
}

export function EditableList({ items, placeholder, addLabel, showPrice = false, onAdd, onRemove, onChange }: EditableListProps) {
    return (
        <div className="space-y-2.5">
            {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F0F4FA] text-[#8996A9]"><Minus className="size-3.5" /></span>
                    <input aria-label={`${placeholder} ${index + 1}`} value={item.name} onChange={(event) => onChange(index, 'name', event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-[#D7E1EF] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" />
                    {showPrice && <div className="relative w-28 shrink-0"><span className="pointer-events-none absolute left-3 top-2.5 text-sm text-[#8996A9]">$</span><input aria-label={`Precio de extra ${index + 1}`} inputMode="decimal" value={item.price ?? ''} onChange={(event) => onChange(index, 'price', event.target.value)} placeholder="0" className="w-full rounded-lg border border-[#D7E1EF] py-2.5 pl-7 pr-2 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" /></div>}
                    <button type="button" onClick={() => onRemove(index)} aria-label={`Eliminar ${placeholder} ${index + 1}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#FFF1F0] hover:text-[#B42318]"><Trash2 className="size-4" /></button>
                </div>
            ))}
            <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-[#2451C5] transition hover:text-[#183991]"><Plus className="size-4" />{addLabel}</button>
        </div>
    )
}
