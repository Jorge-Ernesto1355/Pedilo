'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { isHexColor } from '@/app/components/loyalty/loyaltyDesign'

// Controles del editor de la tarjeta de lealtad. Todos con etiqueta, uso con teclado
// (radios y checkboxes nativos) y áreas táctiles de al menos 44 px.

export const fieldLabel = 'text-sm font-bold text-[#243556]'
export const fieldInput =
    'mt-1 min-h-11 w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#12234A] outline-none transition focus-visible:border-[#1E40AF] focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 aria-[invalid=true]:border-[#B42318]'
export const fieldHint = 'mt-1 block text-xs font-normal text-[#65738A]'
export const fieldError = 'mt-1 block text-xs font-semibold text-[#B42318]'

export function EditorSection({
    id,
    title,
    summary,
    open,
    onToggle,
    children,
}: {
    id: string
    title: string
    summary?: string
    open: boolean
    onToggle: () => void
    children: ReactNode
}) {
    const regionId = `loyalty-section-${id}`
    return (
        <section
            data-cy={`loyalty-section-${id}`}
            className="border-b border-[#E8EEF6] last:border-b-0"
        >
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={regionId}
                    onClick={onToggle}
                    data-cy={`loyalty-section-toggle-${id}`}
                    className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"
                >
                    <span>
                        <span className="block text-[15px] font-bold text-[#12234A]">{title}</span>
                        {summary ? (
                            <span className="mt-0.5 block text-xs text-[#65738A]">{summary}</span>
                        ) : null}
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className={`size-4 shrink-0 text-[#65738A] transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </button>
            </h3>
            <div id={regionId} hidden={!open} className="pb-5">
                {children}
            </div>
        </section>
    )
}

export type Option<T extends string | number> = {
    value: T
    label: string
    description?: string
    preview?: ReactNode
}

/** Grupo de opciones (radios nativos con aspecto de mosaico). */
export function OptionGroup<T extends string | number>({
    legend,
    name,
    value,
    options,
    onChange,
    columns = 3,
    testId,
    hideLegend = false,
}: {
    legend: string
    name: string
    value: T
    options: Option<T>[]
    onChange: (value: T) => void
    columns?: 2 | 3 | 4 | 5 | 6
    testId?: string
    hideLegend?: boolean
}) {
    // Las columnas se ajustan al ancho real del contenedor (el editor comparte fila con la vista
    // previa): cada opción tiene un ancho mínimo en que su texto cabe sin salirse del borde.
    const minWidth = { 2: 150, 3: 108, 4: 104, 5: 96, 6: 84 }[columns]
    return (
        <fieldset data-cy={testId} className="min-w-0">
            <legend className={hideLegend ? 'sr-only' : `${fieldLabel} mb-2`}>{legend}</legend>
            <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}
            >
                {options.map((option) => {
                    const checked = option.value === value
                    return (
                        <label
                            key={String(option.value)}
                            data-cy={testId ? `${testId}-${option.value}` : undefined}
                            data-checked={checked ? 'true' : 'false'}
                            className={`relative flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold [overflow-wrap:anywhere] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#1E40AF]/20 ${
                                checked
                                    ? 'border-[#1E40AF] bg-[#EEF3FF] text-[#1E40AF]'
                                    : 'border-[#D7E1EF] bg-white text-[#243556] hover:border-[#9EB3D8]'
                            }`}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={String(option.value)}
                                checked={checked}
                                onChange={() => onChange(option.value)}
                                className="sr-only"
                            />
                            {option.preview}
                            <span>{option.label}</span>
                            {option.description ? (
                                <span className="text-[11px] font-normal leading-4 text-[#65738A]">
                                    {option.description}
                                </span>
                            ) : null}
                        </label>
                    )
                })}
            </div>
        </fieldset>
    )
}

/** Selector de color con campo hex (#RRGGBB). El valor solo cambia con un hex válido. */
export function ColorField({
    label,
    value,
    onChange,
    testId,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    testId: string
}) {
    const id = useId()
    const [text, setText] = useState(value)
    const [prevValue, setPrevValue] = useState(value)
    if (prevValue !== value) {
        // Sincroniza el campo cuando el color cambia desde fuera (plantilla, corrección).
        setPrevValue(value)
        setText(value)
    }
    const normalized = text.startsWith('#') ? text : `#${text}`
    const invalid = !isHexColor(normalized)
    return (
        <div data-cy={testId} className="min-w-0">
            <label htmlFor={`${id}-hex`} className={fieldLabel}>
                {label}
            </label>
            <div className="mt-1 flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label}: selector de color`}
                    value={value.toLowerCase()}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    data-cy={`${testId}-picker`}
                    className="size-11 shrink-0 cursor-pointer rounded-xl border border-[#D7E1EF] bg-white p-1"
                />
                <input
                    id={`${id}-hex`}
                    value={text}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={invalid}
                    aria-describedby={invalid ? `${id}-error` : undefined}
                    onChange={(event) => {
                        const next = event.target.value.trim().toUpperCase()
                        setText(next)
                        const candidate = next.startsWith('#') ? next : `#${next}`
                        if (isHexColor(candidate)) onChange(candidate)
                    }}
                    onBlur={() => setText(value)}
                    data-cy={`${testId}-hex`}
                    className={`${fieldInput} mt-0 font-mono uppercase`}
                />
            </div>
            {invalid ? (
                <span id={`${id}-error`} className={fieldError}>
                    Usa un color con la forma #RRGGBB.
                </span>
            ) : null}
        </div>
    )
}

export function TextField({
    label,
    value,
    onChange,
    maxLength,
    placeholder,
    hint,
    error,
    testId,
    inputMode,
    prefix,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    maxLength?: number
    placeholder?: string
    hint?: string
    error?: string
    testId: string
    inputMode?: 'numeric' | 'decimal' | 'text'
    prefix?: string
}) {
    const id = useId()
    const describedBy =
        [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
        undefined
    return (
        <div className="min-w-0">
            <label htmlFor={id} className={fieldLabel}>
                {label}
            </label>
            <div className="relative">
                {prefix ? (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-[#65738A]"
                    >
                        {prefix}
                    </span>
                ) : null}
                <input
                    id={id}
                    value={value}
                    maxLength={maxLength ? maxLength + 5 : undefined}
                    placeholder={placeholder}
                    inputMode={inputMode}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    onChange={(event) => onChange(event.target.value)}
                    data-cy={testId}
                    className={`${fieldInput} ${prefix ? 'pl-7' : ''}`}
                />
            </div>
            <span className="flex justify-between gap-2">
                {hint ? (
                    <span id={`${id}-hint`} className={fieldHint}>
                        {hint}
                    </span>
                ) : (
                    <span />
                )}
                {maxLength ? (
                    <span
                        className={`${fieldHint} shrink-0 tabular-nums ${value.length > maxLength ? 'text-[#B42318]' : ''}`}
                    >
                        {value.length}/{maxLength}
                    </span>
                ) : null}
            </span>
            {error ? (
                <span
                    id={`${id}-error`}
                    data-cy={`${testId}-error`}
                    role="alert"
                    className={fieldError}
                >
                    {error}
                </span>
            ) : null}
        </div>
    )
}

export function CheckboxField({
    label,
    checked,
    onChange,
    description,
    disabled,
    testId,
}: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    description?: string
    disabled?: boolean
    testId: string
}) {
    return (
        <label
            className={`flex min-h-11 items-start gap-3 rounded-xl border border-[#E1E8F3] px-3 py-2.5 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#1E40AF]/20 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                data-cy={testId}
                className="mt-0.5 size-4 shrink-0 accent-[#1E40AF]"
            />
            <span>
                <span className="block text-sm font-semibold text-[#243556]">{label}</span>
                {description ? (
                    <span className="block text-xs text-[#65738A]">{description}</span>
                ) : null}
            </span>
        </label>
    )
}

export function RangeField({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    format,
    testId,
}: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
    format?: (value: number) => string
    testId: string
}) {
    const id = useId()
    return (
        <div className="min-w-0">
            <label htmlFor={id} className={`${fieldLabel} flex justify-between gap-2`}>
                <span>{label}</span>
                <span className="font-semibold tabular-nums text-[#65738A]">
                    {format ? format(value) : value}
                </span>
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                data-cy={testId}
                className="mt-2 h-11 w-full cursor-pointer accent-[#1E40AF]"
            />
        </div>
    )
}

const desktopQuery = '(min-width: 1024px)'

function subscribeDesktop(callback: () => void) {
    const media = window.matchMedia(desktopQuery)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
}

/** true en pantallas de escritorio (para abrir todas las secciones por defecto). */
export function useIsDesktop() {
    return useSyncExternalStore(
        subscribeDesktop,
        () => window.matchMedia(desktopQuery).matches,
        () => false,
    )
}
