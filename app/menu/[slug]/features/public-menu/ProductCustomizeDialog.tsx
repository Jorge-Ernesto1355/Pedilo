'use client'

import { Minus, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { PublicProduct } from './publicCatalog.types'
import {
    getOptionMaxSelect,
    getOptionMinSelect,
    validateOptionGroups,
    type OptionQuantities,
} from './optionGroupValidation'
import type { CartSelection } from './types'

export function ProductCustomizeDialog({
    product,
    onClose,
    onAdd,
    initialSelections = [],
    editing = false,
}: {
    product: PublicProduct | null
    onClose: () => void
    onAdd: (selections: CartSelection[]) => void
    initialSelections?: CartSelection[]
    editing?: boolean
}) {
    const groups = useMemo(
        () => product?.optionGroups.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
        [product],
    )
    const [selected, setSelected] = useState<OptionQuantities>(() =>
        selectionsToQuantities(initialSelections, product?.optionGroups ?? []),
    )
    const [comboSelected, setComboSelected] = useState<Record<string, string>>(() =>
        Object.fromEntries(initialSelections.filter((selection) => selection.kind === 'combo-choice' && selection.groupId && selection.productId).map((selection) => [selection.groupId!, selection.productId!])),
    )
    if (!product) return null
    const comboGroups = product.comboOptionGroups?.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? []
    const validation = validateOptionGroups(groups, selected)
    const comboValid = comboGroups.every((group) => group.products.some((choice) => choice.product.isAvailable && choice.productId === comboSelected[group.id]))
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
    const comboSelections: CartSelection[] = comboGroups.flatMap((group) => {
        const choice = group.products.find((item) => item.productId === comboSelected[group.id])
        return choice ? [{ id: choice.id, name: `${group.name}: ${choice.product.name}`, price: 0, quantity: 1, kind: 'combo-choice', groupId: group.id, productId: choice.productId }] : []
    })
    const total = product.price + selectedOptions.reduce((sum, option) => sum + option.price * option.quantity, 0)
    function changeQuantity(groupId: string, optionId: string, delta: number) {
        setSelected((current) => {
            const group = groups.find((item) => item.id === groupId)
            if (!group) return current
            const currentQuantity = current[groupId]?.[optionId] ?? 0
            const max = getOptionMaxSelect(group.options.find((item) => item.id === optionId)!)
            const nextQuantity = Math.max(0, Math.min(currentQuantity + delta, max))
            const min = getOptionMinSelect(group.options.find((item) => item.id === optionId)!)
            if (delta < 0 && nextQuantity < min) return current
            if (delta > 0 && currentQuantity >= max) return current
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
                <div className="flex min-w-0 items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            {editing ? 'Edita tu pedido' : 'Personaliza tu pedido'}
                        </p>
                        <h2
                            id="customize-title"
                            className="mt-1 max-w-full break-words font-display text-xl text-[#12234A] [overflow-wrap:anywhere]"
                        >
                            {product.name}
                        </h2>
                        {product.description && (
                            <p className="mt-1 max-w-full break-words text-sm text-[#65738A] [overflow-wrap:anywhere]">
                                {product.description}
                            </p>
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
                    {product.includedProducts && product.includedProducts.length > 0 && (
                        <section aria-label="Productos incluidos" className="rounded-xl bg-[#F6F8FC] px-4 py-3">
                            <h3 className="text-sm font-bold text-[#243556]">Incluye</h3>
                            <p className="mt-1 max-w-full break-words text-sm leading-5 text-[#65738A] [overflow-wrap:anywhere]">
                                {product.includedProducts.map((item) => item.product.name).join(', ')}
                            </p>
                        </section>
                    )}
                    {comboGroups.map((group) => (
                        <fieldset key={group.id}>
                            <legend className="text-sm font-bold text-[#243556]">{group.name}<span className="ml-2 text-xs font-normal text-[#8996A9]">Elige una opción</span></legend>
                            <div className="mt-3 space-y-2">
                                {group.products.filter((choice) => choice.product.isAvailable).map((choice) => (
                                    <label key={choice.id} className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 ${comboSelected[group.id] === choice.productId ? 'border-[#2451C5] bg-[#F4F7FF]' : 'border-[#E8EEF6]'}`}>
                                        <input type="radio" name={`combo-${group.id}`} value={choice.productId} checked={comboSelected[group.id] === choice.productId} onChange={() => setComboSelected((current) => ({ ...current, [group.id]: choice.productId }))} className="size-4 accent-[#2451C5]" />
                                        <span className="min-w-0 max-w-full break-words text-sm font-semibold text-[#243556] [overflow-wrap:anywhere]">{choice.product.name}</span>
                                    </label>
                                ))}
                            </div>
                            {!comboSelected[group.id] && <p className="mt-2 text-xs text-[#65738A]">Selecciona una opción para continuar.</p>}
                        </fieldset>
                    ))}
                    {groups.map((group) => {
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
                                            ? 'Selecciona al menos una opción'
                                            : 'Opciones individuales'}
                                    </span>
                                </legend>
                                <div className="mt-3 space-y-2">
                                    {group.options
                                        .slice()
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((option) => {
                                            const quantity = selected[group.id]?.[option.id] ?? 0
                                            const optionMax = getOptionMaxSelect(option)
                                            const optionMin = getOptionMinSelect(option)
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
                                                        <span className="ml-2 text-[11px] font-normal text-[#8996A9]">
                                                            {optionMin}–{optionMax}
                                                        </span>
                                                    </span>
                                                    <div className="flex min-h-11 items-center gap-1 rounded-lg border border-[#DCE5F3] px-1 sm:min-h-8 sm:gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={quantity <= optionMin}
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    group.id,
                                                                    option.id,
                                                                    -1,
                                                                )
                                                            }
                                                            aria-label={`Quitar ${option.name}`}
                                                            className="grid size-10 place-items-center rounded text-[#65738A] hover:bg-[#F5F8FC] disabled:opacity-30 sm:size-6"
                                                        >
                                                            <Minus className="size-3.5" />
                                                        </button>
                                                        <span className="w-4 text-center text-xs font-bold text-[#12234A]">
                                                            {quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !option.isAvailable ||
                                                                quantity >= optionMax
                                                            }
                                                            onClick={() =>
                                                                changeQuantity(
                                                                    group.id,
                                                                    option.id,
                                                                    1,
                                                                )
                                                            }
                                                            aria-label={`Agregar ${option.name}`}
                                                            className="grid size-10 place-items-center rounded text-[#2451C5] hover:bg-[#EAF0FF] disabled:opacity-30 sm:size-6"
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
                        disabled={!validation.valid || !comboValid}
                        onClick={() => {
                            onAdd([...selectedOptions.map((option) => ({ ...option, kind: 'product-option' as const })), ...comboSelections])
                            onClose()
                        }}
                        className="min-h-11 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {editing ? 'Guardar cambios' : 'Agregar al pedido'}
                    </button>
                </div>
            </section>
        </div>
    )
}

function selectionsToQuantities(
    selections: CartSelection[],
    groups: PublicProduct['optionGroups'],
): OptionQuantities {
    const result: OptionQuantities = {}
    for (const selection of selections) {
        const group = groups.find((item) =>
            item.options.some((option) => option.id === selection.id),
        )
        if (!group) continue
        result[group.id] = {
            ...(result[group.id] ?? {}),
            [selection.id]: selection.quantity,
        }
    }
    return result
}
