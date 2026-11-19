'use client'

import { useSyncExternalStore } from 'react'

// Debajo del breakpoint `sm` de Tailwind (640px): donde el drawer de nueva orden usa
// su composición compacta. Se resuelve en JS (y no ocultando con CSS) para que exista
// un solo árbol en el DOM y los selectores de escritorio no encuentren duplicados.
const SMALL_SCREEN_QUERY = '(max-width: 639.98px)'

function subscribe(onChange: () => void) {
    const query = window.matchMedia(SMALL_SCREEN_QUERY)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

export function useIsSmallScreen() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(SMALL_SCREEN_QUERY).matches,
        () => false,
    )
}
