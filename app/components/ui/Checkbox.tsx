import type { InputHTMLAttributes } from 'react'

/**
 * Checkbox de Pedilo. Sigue siendo un <input type="checkbox"> nativo (teclado, lectores de
 * pantalla, formularios y `check()` de Cypress funcionan igual); solo cambia el dibujo, que
 * vive en `.pedilo-checkbox` (globals.css). Se usa dentro de un <label>.
 */
export function Checkbox({
    className = '',
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
    return <input type="checkbox" className={`pedilo-checkbox ${className}`} {...props} />
}
