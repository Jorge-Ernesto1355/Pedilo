'use client'

import { useMemo, useState } from 'react'
import type { CartLine, CartSelection, PublicMenuProduct } from './types'

function getUnitPrice(product: PublicMenuProduct, selections: CartSelection[]) {
    return (
        product.price +
        selections.reduce((total, selection) => total + selection.price * selection.quantity, 0)
    )
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
        const key = [
            product.id,
            ...selections.map((selection) => `${selection.id}:${selection.quantity}`).sort(),
        ].join(':')
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

    return { lines, totalItems, total, add, changeQuantity, clear }
}
