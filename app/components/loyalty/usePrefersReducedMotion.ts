'use client'

import { useSyncExternalStore } from 'react'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void) {
    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
    const media = window.matchMedia(reducedMotionQuery)
    media.addEventListener?.('change', callback)
    return () => media.removeEventListener?.('change', callback)
}

/** Movimiento reducido del sistema (sin movimiento: solo un fundido de color). */
export function usePrefersReducedMotion() {
    return useSyncExternalStore(
        subscribe,
        () =>
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia(reducedMotionQuery).matches
                : false,
        () => false,
    )
}
