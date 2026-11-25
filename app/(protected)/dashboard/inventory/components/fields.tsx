import type { ReactNode, SelectHTMLAttributes } from 'react'

export const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8996A9]'

const selectClass =
    'w-full cursor-pointer appearance-none rounded-xl border border-[#D7E1EF] bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-[#243556] outline-none transition duration-150 hover:border-[#9DB2D9] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#8996A9] disabled:hover:border-[#D7E1EF] disabled:active:scale-100'

/** Native select (keeps mobile pickers and a11y) with a custom chevron and the form's field styling. */
export function Select({
    className = '',
    children,
    ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className={`group relative ${className}`}>
            <select {...props} className={selectClass}>
                {children}
            </select>
            <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#65738A] transition duration-150 group-focus-within:rotate-180 group-focus-within:text-[#2451C5] group-has-[:disabled]:text-[#B3BDCC]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="m5 7.5 5 5 5-5" />
            </svg>
        </div>
    )
}

export const primaryButtonClass =
    'rounded-xl bg-[#2451C5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60'

export const ghostButtonClass =
    'rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] hover:bg-[#F4F7FB] disabled:opacity-60'

export function Field({
    label,
    hint,
    error,
    required,
    children,
}: {
    label: string
    hint?: string
    error?: string
    required?: boolean
    children: ReactNode
}) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-sm font-semibold text-[#243556]">
                {label}
                {required && <span className="ml-1 text-[#B42318]">*</span>}
            </span>
            {children}
            {hint && !error && <span className="block text-xs text-[#8996A9]">{hint}</span>}
            {error && <span className="block text-xs font-medium text-[#B42318]">{error}</span>}
        </label>
    )
}

export function FormError({ message }: { message?: string }) {
    if (!message) return null
    return (
        <div
            role="alert"
            className="rounded-xl border border-[#F4C7C3] bg-[#FFF4F2] px-3 py-2.5 text-sm text-[#B42318]"
        >
            {message}
        </div>
    )
}

/** Parses a user-typed decimal ("1.5", "1,5"); returns null when empty or invalid. */
export function parseDecimal(value: string): number | null {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
}

/** Percent inputs: whole numbers only, at most 3 digits. */
export function digitsOnly(value: string) {
    return value.replace(/\D/g, '').slice(0, 3)
}

/** True for a whole number from 1 to 100. */
export function validPercent(value: string) {
    if (!/^\d{1,3}$/.test(value)) return false
    const n = Number(value)
    return n > 0 && n <= 100
}

/** Quantity inputs: digits plus one decimal separator, up to 2 decimals. */
export function quantityOnly(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
    const [whole = '', ...rest] = cleaned.split('.')
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole
}
