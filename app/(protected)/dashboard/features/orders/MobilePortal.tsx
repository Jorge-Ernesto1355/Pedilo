'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsSmallScreen } from './useIsSmallScreen'

/**
 * En pantallas chicas monta su contenido en <body>. Lo que se renderiza dentro de la página
 * vive bajo el contexto de apilamiento de `#main-content` y queda por debajo de la
 * navegación inferior; una pantalla completa necesita cubrirla. Desde `sm` no hace nada.
 */
export function MobilePortal({ children }: { children: ReactNode }) {
    const isSmall = useIsSmallScreen()
    if (!isSmall || typeof document === 'undefined') return children
    return createPortal(children, document.body)
}
