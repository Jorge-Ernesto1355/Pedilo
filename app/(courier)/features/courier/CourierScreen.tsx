import type { ReactNode } from 'react'

// Piezas comunes de las páginas del repartidor: se usan en la calle, con una mano y
// con datos móviles. Botones grandes, texto corto, sin decoración.

export function CourierScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <main
            id="main-content"
            className={`min-h-[100svh] bg-[#F5F8FC] px-4 pt-4 text-[#12234A] ${footer ? 'pb-44' : 'pb-10'}`}
        >
            <div className="mx-auto w-full max-w-md space-y-4">
                <header className="flex items-center justify-between">
                    <span className="font-display text-lg font-bold tracking-tight text-[#2438A8]">
                        Pedilo
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7A90]">
                        Entregas
                    </span>
                </header>
                {children}
            </div>
            {footer && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#DCE5F3] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                    <div className="mx-auto w-full max-w-md space-y-2">{footer}</div>
                </div>
            )}
        </main>
    )
}

export function Card({
    children,
    className = '',
    padding = 'p-4',
    cy,
}: {
    children: ReactNode
    className?: string
    /** Clase de padding propia (p. ej. 'p-0' para que el mapa llegue al borde). */
    padding?: string
    cy?: string
}) {
    return (
        <section
            data-cy={cy}
            className={`rounded-2xl border border-[#DCE5F3] bg-white ${padding} ${className}`}
        >
            {children}
        </section>
    )
}

const tones = {
    neutral: 'bg-[#EEF3FF] text-[#2438A8]',
    green: 'bg-[#E8F6EE] text-[#1D6B3F]',
    amber: 'bg-[#FFF5DB] text-[#8A5A00]',
    red: 'bg-[#FDECEA] text-[#B42318]',
} as const

/** Pantalla completa para un estado (tomada, expirada, entregada…). */
export function StateScreen({
    cy,
    icon,
    tone = 'neutral',
    title,
    text,
    children,
}: {
    cy: string
    icon: ReactNode
    tone?: keyof typeof tones
    title: string
    text?: ReactNode
    children?: ReactNode
}) {
    return (
        <Card cy={cy} className="space-y-4" padding="px-5 py-6">
            <span
                aria-hidden="true"
                className={`flex size-12 items-center justify-center rounded-xl ${tones[tone]}`}
            >
                {icon}
            </span>
            <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>
                {text && <p className="text-base leading-6 text-[#53647D]">{text}</p>}
            </div>
            {children}
        </Card>
    )
}

// Cada variante es completa: no se sobrescriben clases (en Tailwind gana el orden del CSS, no el del className).
const buttonBase =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60'
const bigButton = `${buttonBase} min-h-14 px-5 text-base disabled:cursor-wait`
const outline =
    'border border-[#D7E1EF] bg-white hover:border-[#B9CDFD] focus-visible:ring-[#2438A8]/15'

export const primaryButton = `${bigButton} bg-[#2438A8] text-white hover:bg-[#1D2F91] focus-visible:ring-[#2438A8]/25`
export const successButton = `${bigButton} bg-[#23814C] text-white hover:bg-[#1D6B3F] focus-visible:ring-[#23814C]/25`
export const dangerButton = `${bigButton} bg-[#B42318] text-white hover:bg-[#962014] focus-visible:ring-[#B42318]/25`
export const secondaryButton = `${bigButton} ${outline} text-[#243556]`
/** "No se pudo entregar": contorno con texto rojo, para no competir con "Entregado". */
export const dangerOutlineButton = `${bigButton} ${outline} text-[#B42318]`
/** Dos botones lado a lado dentro de una tarjeta (Maps / Llamar). */
export const compactButton = `${buttonBase} ${outline} min-h-12 whitespace-nowrap px-3 text-sm text-[#243556]`

/** Error discreto (no alertas): una línea en rojo junto a la acción que falló. */
export function InlineError({ cy, children }: { cy: string; children: ReactNode }) {
    return (
        <p data-cy={cy} role="alert" className="text-sm font-medium leading-5 text-[#B42318]">
            {children}
        </p>
    )
}

export function OfferSkeleton() {
    return (
        <div
            data-cy="courier-skeleton"
            aria-busy="true"
            aria-label="Cargando"
            className="space-y-4"
        >
            <div className="animate-pulse space-y-4 rounded-2xl border border-[#DCE5F3] bg-white p-5">
                <div className="h-4 w-36 rounded bg-[#E8EEF6]" />
                <div className="h-8 w-56 rounded bg-[#DCE5F3]" />
                <div className="h-4 w-48 rounded bg-[#E8EEF6]" />
                <div className="h-16 rounded-xl bg-[#F1F4F9]" />
                <div className="h-12 rounded-xl bg-[#F1F4F9]" />
            </div>
            <div className="h-14 animate-pulse rounded-xl bg-[#DCE5F3]" />
        </div>
    )
}

export function DeliverySkeleton() {
    return (
        <div
            data-cy="courier-skeleton"
            aria-busy="true"
            aria-label="Cargando"
            className="space-y-4"
        >
            <div className="animate-pulse space-y-3 rounded-2xl border border-[#DCE5F3] bg-white p-5">
                <div className="h-4 w-28 rounded bg-[#E8EEF6]" />
                <div className="h-7 w-52 rounded bg-[#DCE5F3]" />
                <div className="h-4 w-64 rounded bg-[#E8EEF6]" />
            </div>
            <div className="h-52 animate-pulse rounded-2xl bg-[#DCE5F3]" />
            <div className="animate-pulse space-y-3 rounded-2xl border border-[#DCE5F3] bg-white p-5">
                <div className="h-5 w-full rounded bg-[#F1F4F9]" />
                <div className="h-5 w-full rounded bg-[#F1F4F9]" />
                <div className="h-5 w-2/3 rounded bg-[#F1F4F9]" />
            </div>
        </div>
    )
}
