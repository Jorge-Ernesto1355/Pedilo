'use client'

import { useState } from 'react'

/**
 * Número de un selector de cantidad. Cuando el valor cambia vuelve a "saltar" desde pequeño
 * (`.pedilo-qty-pop`, globals.css); en el primer render no anima.
 */
export function QtyNumber({
    value,
    className = '',
    'data-testid': testId,
}: {
    value: number
    className?: string
    'data-testid'?: string
}) {
    const [previous, setPrevious] = useState(value)
    const [changes, setChanges] = useState(0)
    if (previous !== value) {
        setPrevious(value)
        setChanges((current) => current + 1)
    }
    return (
        <span
            key={changes}
            data-testid={testId}
            className={`${changes > 0 ? 'pedilo-qty-pop' : ''} ${className}`}
        >
            {value}
        </span>
    )
}
