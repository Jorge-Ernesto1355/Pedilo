'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { AlertCircle, Check, LoaderCircle, MessageCircle } from 'lucide-react'
import { formatMxPhone, validateMxPhone } from '@/src/lib/validation/phone'

type WhatsAppPhoneFieldProps = {
    savedNumber: string | null
    onSave: (e164: string) => Promise<void>
    inputRef: RefObject<HTMLInputElement | null>
    onSaved: () => void
}

export function WhatsAppPhoneField({
    savedNumber,
    onSave,
    inputRef,
    onSaved,
}: WhatsAppPhoneFieldProps) {
    const [value, setValue] = useState(() => (savedNumber ? formatMxPhone(savedNumber) : ''))
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [saving, setSaving] = useState(false)
    const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const currentValidation = validateMxPhone(value)
    const isSaved = Boolean(savedNumber && currentValidation.e164 === savedNumber)

    useEffect(() => {
        // Rehydrate when a settings response arrives or changes outside this form.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(savedNumber ? formatMxPhone(savedNumber) : '')
    }, [savedNumber])

    useEffect(
        () => () => {
            if (successTimer.current) clearTimeout(successTimer.current)
        },
        [],
    )

    function changeValue(nextValue: string) {
        const allowed = nextValue.replace(/[^\d+\s().-]/g, '')
        const containsForbidden = allowed !== nextValue
        const formatted = formatMxPhone(allowed)
        setValue(formatted)
        setSuccess(false)
        if (successTimer.current) clearTimeout(successTimer.current)

        if (containsForbidden) {
            setError('Solo se permiten números.')
        } else if (error) {
            setError(validateMxPhone(formatted).error)
        }
    }

    function validate() {
        const result = validateMxPhone(value)
        setError(result.error)
        return result
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const result = validate()
        if (!result.valid || !result.e164) {
            inputRef.current?.focus()
            return
        }
        if (isSaved) return

        setSaving(true)
        setError(null)
        setSuccess(false)
        try {
            await onSave(result.e164)
            onSaved()
            setSuccess(true)
            successTimer.current = setTimeout(() => setSuccess(false), 3000)
        } catch {
            setError('No pudimos guardar el número. Intenta de nuevo.')
            // Saving disables the field; focus it after the pending state is removed.
            window.setTimeout(() => inputRef.current?.focus(), 0)
        } finally {
            setSaving(false)
        }
    }

    const fieldHasError = Boolean(error)
    const inputClass = fieldHasError
        ? 'border-red-500 ring-4 ring-red-100'
        : success
          ? 'border-green-500'
          : 'border-[#E3E8F2] hover:border-slate-300 focus:border-[#2D43B8] focus:ring-4 focus:ring-indigo-100'

    return (
        <form className="mt-4 flex flex-col" onSubmit={submit} noValidate>
            <label className="sr-only" htmlFor="business-whatsapp">
                Número de WhatsApp
            </label>
            <div className="relative">
                <MessageCircle
                    aria-hidden="true"
                    className={`absolute left-4 top-1/2 size-[22px] -translate-y-1/2 ${fieldHasError ? 'text-red-500' : 'text-[#3B4560]'}`}
                />
                <input
                    ref={inputRef}
                    id="business-whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={24}
                    value={value}
                    disabled={saving}
                    placeholder="+52 55 1234 5678"
                    aria-invalid={fieldHasError}
                    aria-describedby={fieldHasError ? 'business-whatsapp-error' : undefined}
                    onChange={(event) => changeValue(event.target.value)}
                    onBlur={() => {
                        if (value || error) validate()
                    }}
                    className={`h-11 w-full rounded-xl border bg-white pl-11 pr-11 text-sm text-[#3B4560] outline-none transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
                />
                {success && (
                    <Check
                        aria-hidden="true"
                        className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-green-500"
                    />
                )}
            </div>

            {fieldHasError && (
                <p
                    id="business-whatsapp-error"
                    className="mt-2 flex animate-[phone-error-in_150ms_ease-out] items-center gap-1.5 text-sm font-medium text-[#DC2626]"
                    role="alert"
                >
                    <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                    {error}
                </p>
            )}
            {success && (
                <p className="mt-2 text-sm font-medium text-[#16A34A]" role="status">
                    Número guardado correctamente.
                </p>
            )}

            <button
                type="submit"
                disabled={saving || isSaved}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2438A8] px-3 text-sm font-semibold text-white shadow-md shadow-indigo-900/15 transition hover:bg-[#1D2F93] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {saving ? (
                    <>
                        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <Check aria-hidden="true" className="size-5" />
                        {savedNumber ? 'Actualizar número' : 'Guardar número'}
                    </>
                )}
            </button>
        </form>
    )
}
