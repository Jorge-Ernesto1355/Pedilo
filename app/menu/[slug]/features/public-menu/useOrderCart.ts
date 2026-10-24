'use client'

import { useMemo, useState } from 'react'
import type { CartLine, CartSelection, PublicMenuProduct } from './types'

function getUnitPrice(product: PublicMenuProduct, selections: CartSelection[]) {
    return (
        product.price +
        selections.reduce((total, selection) => total + selection.price * selection.quantity, 0)
    )
}

function getLineKey(product: PublicMenuProduct, selections: CartSelection[]) {
    return [
        product.id,
        ...selections.map((selection) => `${selection.id}:${selection.quantity}`).sort(),
    ].join(':')
}

export function useOrderCart() {
    const [lines, setLines] = useState<CartLine[]>([])
    const totalItems = useMemo(
        () => lines.reduce((total, line) => total + line.quantity, 0),
        [lines],
    )
    const total = useMemo(
        () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
        [lines],
    )

    function add(product: PublicMenuProduct, selections: CartSelection[] = []) {
        const key = getLineKey(product, selections)
        const unitPrice = getUnitPrice(product, selections)
        setLines((current) => {
            const existing = current.find((line) => line.key === key)
            if (existing)
                return current.map((line) =>
                    line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
                )
            return [...current, { key, product, quantity: 1, selections, unitPrice }]
        })
    }

    function edit(key: string, selections: CartSelection[]) {
        setLines((current) => {
            const line = current.find((item) => item.key === key)
            if (!line) return current
            const nextKey = getLineKey(line.product, selections)
            const nextLine = {
                ...line,
                key: nextKey,
                selections,
                unitPrice: getUnitPrice(line.product, selections),
            }
            const duplicate = current.find((item) => item.key === nextKey && item.key !== key)
            if (duplicate)
                return current
                    .filter((item) => item.key !== key && item.key !== nextKey)
                    .concat({ ...duplicate, quantity: duplicate.quantity + line.quantity })
            return current.map((item) => (item.key === key ? nextLine : item))
        })
    }

    function changeQuantity(key: string, delta: number) {
        setLines((current) =>
            current.flatMap((line) =>
                line.key === key && line.quantity + delta <= 0
                    ? []
                    : line.key === key
                      ? [{ ...line, quantity: line.quantity + delta }]
                      : [line],
            ),
        )
    }

    function clear() {
        setLines([])
    }

    return { lines, totalItems, total, add, edit, changeQuantity, clear }
}
