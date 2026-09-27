'use client'

import { Minus, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PublicProduct } from './publicCatalog.types'
import {
    getGroupMaxSelect,
    getSelectedQuantity,
    validateOptionGroups,
    type OptionQuantities,
} from './optionGroupValidation'
import type { CartSelection } from './types'

export function ProductCustomizeDialog({
    product,
    onClose,
    onAdd,
}: {
    product: PublicProduct | null
    onClose: () => void
    onAdd: (selections: CartSelection[]) => void
}) {
    const groups = useMemo(
        () => product?.optionGroups.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
        [product],
    )
    const [selected, setSelected] = useState<OptionQuantities>({})
    if (!product) return null
    const validation = validateOptionGroups(groups, selected)
    const selectedOptions = groups.flatMap((group) =>
        group.options
            .filter((option) => (selected[group.id]?.[option.id] ?? 0) > 0)
            .map((option) => ({
                id: option.id,
                name: `${group.name}: ${option.name}`,
                price: option.price,
                quantity: selected[group.id]?.[option.id] ?? 0,
            })),
    )
    const total =
        product.price +
        selectedOptions.reduce((sum, option) => sum + option.price * option.quantity, 0)
    function changeQuantity(groupId: string, optionId: string, delta: number) {
        setSelected((current) => {
            const group = groups.find((item) => item.id === groupId)
            if (!group) return current
            const currentQuantity = current[groupId]?.[optionId] ?? 0
            const groupQuantity = getSelectedQuantity(groupId, current)
            const max = getGroupMaxSelect(group)
            const nextQuantity = Math.max(
                0,
                Math.min(currentQuantity + delta, max - (groupQuantity - currentQuantity)),
            )
            if (
                delta < 0 &&
                group.isRequired &&
                groupQuantity <= (group.minSelect ?? group.minSelections)
            )
                return current
            return {
                ...current,
                [groupId]: { ...(current[groupId] ?? {}), [optionId]: nextQuantity },
            }
        })
    }
    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#10224A]/25 p-0 sm:items-center sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="customize-title"
                className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-lg sm:rounded-[24px]"
            >
                <div className="flex items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            Personaliza tu pedido
                        </p>
                        <h2
                            id="customize-title"
                            className="mt-1 font-display text-xl text-[#12234A]"
                        >
                            {product.name}
                        </h2>
                        {product.description && (
                            <p className="mt-1 text-sm text-[#65738A]">{product.description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar personalización"
                        className="grid size-9 place-items-center rounded-lg text-[#8996A9] hover:bg-[#F5F8FC]"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <div className="space-y-6 px-5 py-5">
                    <p className="text-sm text-[#65738A]">
                        Precio base:{' '}
                        <strong className="text-[#12234A]">
                            ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </strong>
                    </p>
                    {groups.map((group) => {
                        const groupQuantity = getSelectedQuantity(group.id, selected)
                        const groupError = validation.errors.find(
                            (error) => error.groupId === group.id,
                        )
                        return (
                            <fieldset key={group.id}>
                                <legend className="text-sm font-bold text-[#243556]">
                                    {group.name}{' '}
                                    {group.isRequired && <span className="text-[#B42318]">*</span>}
                                    <span className="ml-2 text-xs font-normal text-[#8996A9]">
                                        {group.isRequired
                                            ? `Mínimo ${group.minSelect ?? group.minSelections} · máximo ${getGroupMaxSelect(group)}`
                                            : `Opcional · máximo ${getGroupMaxSelect(group)}`}
                                    </span>
                                </legend>
                                <div className="mt-3 space-y-2">
                                    {group.options
                                        .slice()
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((option) => {
                                            const quantity = selected[group.id]?.[option.id] ?? 0
                                            const atMax = groupQuantity >= getGroupMaxSelect(group)
                                            return (
                                                <div
                                                    key={option.id}
                                                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${quantity > 0 ? 'border-[#2451C5] bg-[#F4F7FF]' : 'border-[#E8EEF6]'}`}
                                                >
                                                    <span className="min-w-0 flex-1 text-sm font-semibold text-[#243556]">
                                                        {option.name}
                                                        {option.price > 0 && (
                                                            <span className="ml-1 text-xs font-bold text-[#2451C5]">
                                                                +$
                                                                {option.price.toLocaleString(
                                                                    'es-MX',
                                                                )}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-2 rounded-lg border border-[#DCE5F3] px-1">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                quantity <= 0 ||
                                                                (group.isRequired &&
                                                                    groupQuantity <=
                                                                        (group.minSelect ??
                                                                            group.minSelections))
                                                            }
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    group.id,
                                                                    option.id,
                                                                    -1,
                                                                )
                                                            }
                                                            aria-label={`Quitar ${option.name}`}
                                                            className="grid size-7 place-items-center rounded text-[#65738A] disabled:opacity-30"
                                                        >
                                                            <Minus className="size-3.5" />
                                                        </button>
                                                        <span className="w-5 text-center text-sm font-bold text-[#12234A]">
                                                            {quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={!option.isAvailable || atMax}
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    group.id,
                                                                    option.id,
                                                                    1,
                                                                )
                                                            }
                                                            aria-label={`Agregar ${option.name}`}
                                                            className="grid size-7 place-items-center rounded text-[#2451C5] disabled:opacity-30"
                                                        >
                                                            <Plus className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                </div>
                                {groupError && (
                                    <p className="mt-2 text-xs font-medium text-[#B42318]">
                                        {groupError.message}
                                    </p>
                                )}
                            </fieldset>
                        )
                    })}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#E8EEF6] px-5 py-4">
                    <p className="font-display text-xl text-[#12234A]">
                        ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <button
                        type="button"
                        disabled={!validation.valid}
                        onClick={() => {
                            onAdd(selectedOptions)
                            onClose()
                        }}
                        className="rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        Agregar al pedido
                    </button>
                </div>
            </section>
        </div>
    )
}
