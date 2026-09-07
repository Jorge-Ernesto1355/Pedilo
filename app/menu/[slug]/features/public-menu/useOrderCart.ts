'use client'

import { useMemo, useState } from 'react'
import type { CartLine, CartSelection, PublicMenuProduct } from './types'

function getUnitPrice(product: PublicMenuProduct, option: CartSelection | null, extras: CartSelection[]) {
    return product.price + (option?.price ?? 0) + extras.reduce((total, extra) => total + extra.price, 0)
}

export function useOrderCart() {
    const [lines, setLines] = useState<CartLine[]>([])
    const totalItems = useMemo(() => lines.reduce((total, line) => total + line.quantity, 0), [lines])
    const total = useMemo(() => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), [lines])

    function add(product: PublicMenuProduct, option: CartSelection | null = null, extras: CartSelection[] = []) {
        const key = [product.id, option?.id ?? 'none', ...extras.map((extra) => extra.id).sort()].join(':')
        const unitPrice = getUnitPrice(product, option, extras)
        setLines((current) => {
            const existing = current.find((line) => line.key === key)
            if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line)
            return [...current, { key, product, quantity: 1, option, extras, unitPrice }]
        })
    }

    function changeQuantity(key: string, delta: number) {
        setLines((current) => current.flatMap((line) => line.key === key && line.quantity + delta <= 0 ? [] : line.key === key ? [{ ...line, quantity: line.quantity + delta }] : [line]))
    }

    return { lines, totalItems, total, add, changeQuantity }
}
