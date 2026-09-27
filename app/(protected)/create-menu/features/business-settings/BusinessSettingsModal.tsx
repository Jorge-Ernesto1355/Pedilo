'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Save } from 'lucide-react'
import { sileo } from 'sileo'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { isValidPhone } from '@/src/lib/validation/phone'
import { useBusinessSettings } from './useBusinessSettings'
import type { BusinessSettings, BusinessSettingsInput } from './businessSettings.types'

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 disabled:cursor-not-allowed disabled:bg-[#F5F8FC]'
const descriptionClass = 'mt-1.5 text-xs leading-5 text-[#7A879A]'
const timezoneOptions = [
    'America/Mazatlan',
    'America/Mexico_City',
    'America/Monterrey',
    'America/Tijuana',
    'America/New_York',
    'America/Los_Angeles',
    'UTC',
]
const currencyOptions = ['MXN', 'USD']

type BusinessSettingsModalProps = {
    open: boolean
    onClose: () => void
}

type FormState = {
    currency: string
    phone: string
    whatsapp: string
    timezone: string
}

function onlyDigits(value: string) {
    return value.replace(/\D/g, '').slice(0, 15)
}

function formStateFromSettings(settings: BusinessSettings): FormState {
    return {
        currency: settings.currency,
        phone: onlyDigits(settings.phone ?? ''),
        whatsapp: onlyDigits(settings.whatsapp ?? ''),
        timezone: settings.timezone,
    }
}

function validTimezone(value: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
        return true
    } catch {
        return false
    }
}

function errorMessage(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback
    if (error.code === 'NOT_AUTHENTICATED' || error.status === 401)
        return 'Tu sesión terminó. Inicia sesión nuevamente para configurar tu negocio.'
    if (error.code === 'BUSINESS_NOT_FOUND' || error.status === 404)
        return 'No encontramos un negocio asociado a tu cuenta.'
    if (error.code === 'VALIDATION_ERROR' || error.status === 400)
        return 'Revisa los datos ingresados e inténtalo de nuevo.'
    if (error.code === 'SETTINGS_ALREADY_EXISTS' || error.status === 409)
        return 'La configuración ya existe. Vuelve a abrirla para actualizarla.'
    if (error.code === 'INTERNAL_ERROR' || error.status === 500)
        return 'Ocurrió un error del servidor. Inténtalo nuevamente.'
    return error.message || fallback
}

export function BusinessSettingsModal({ open, onClose }: BusinessSettingsModalProps) {
    const { settings, create, update } = useBusinessSettings(open)
    const [initial, setInitial] = useState<FormState | null>(null)
    const [currency, setCurrency] = useState('')
    const [phone, setPhone] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [timezone, setTimezone] = useState('America/Mazatlan')
    const [validationError, setValidationError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || !settings.data) return
        const next = formStateFromSettings(settings.data)
        // The form must be reset when the authenticated settings response arrives.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInitial(next)
        setCurrency(next.currency)
        setPhone(next.phone)
        setWhatsapp(next.whatsapp)
        setTimezone(next.timezone)
        setValidationError(null)
    }, [open, settings.data])

    const isSaving = create.isPending || update.isPending
    const isLoading = settings.isLoading || (open && settings.isFetching && !settings.data)

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setValidationError(null)

        const normalizedCurrency = currency.trim()
        const normalizedTimezone = timezone.trim()
        if (!normalizedCurrency) {
            setValidationError('La moneda no puede estar vacía.')
            return
        }
        if (phone && !isValidPhone(phone)) {
            setValidationError('El teléfono debe contener exactamente 10 dígitos.')
            return
        }
        if (whatsapp && !isValidPhone(whatsapp)) {
            setValidationError('El WhatsApp debe contener exactamente 10 dígitos.')
            return
        }
        if (!normalizedTimezone || !validTimezone(normalizedTimezone)) {
            setValidationError('Selecciona una zona horaria válida.')
            return
        }

        const next: FormState = {
            currency: normalizedCurrency,
            phone: onlyDigits(phone),
            whatsapp: onlyDigits(whatsapp),
            timezone: normalizedTimezone,
        }
        const payload: BusinessSettingsInput = {}

        if (!initial) {
            payload.currency = next.currency
            payload.phone = next.phone || null
            payload.whatsapp = next.whatsapp || null
            payload.timezone = next.timezone
        } else {
            if (next.currency !== initial.currency) payload.currency = next.currency
            if (next.phone !== initial.phone) payload.phone = next.phone || null
            if (next.whatsapp !== initial.whatsapp) payload.whatsapp = next.whatsapp || null
            if (next.timezone !== initial.timezone) payload.timezone = next.timezone
        }

        if (Object.keys(payload).length === 0) {
            setValidationError('No hay cambios para guardar.')
            return
        }

        const mutation = initial ? update : create
        mutation.mutate(payload, {
            onSuccess: (saved) => {
                const nextState = formStateFromSettings(saved)
                setInitial(nextState)
                setCurrency(nextState.currency)
                setPhone(nextState.phone)
                setWhatsapp(nextState.whatsapp)
                setTimezone(nextState.timezone)
                sileo.success({ title: 'Configuración guardada' })
                onClose()
            },
            onError: (error) => {
                const message = errorMessage(error, 'No pudimos guardar la configuración.')
                setValidationError(message)
                sileo.error({ title: message })
            },
        })
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Business Settings"
            description="Configura la información y preferencias principales de tu negocio, como datos de contacto, dirección, moneda y zona horaria."
            size="lg"
        >
            {isLoading ? (
                <div
                    className="grid min-h-56 place-items-center text-sm text-[#65738A]"
                    aria-live="polite"
                >
                    <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        Cargando configuración…
                    </span>
                </div>
            ) : settings.isError ? (
                <div
                    className="rounded-xl border border-[#F0D7D7] bg-[#FFF9F9] p-4 text-sm text-[#9A3D3D]"
                    role="alert"
                >
                    {errorMessage(settings.error, 'No pudimos cargar la configuración.')}
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-5">
                    <SettingsField
                        id="settings-currency"
                        label="Moneda"
                        description="Define la moneda utilizada para mostrar los precios y ventas de tu negocio."
                    >
                        <select
                            id="settings-currency"
                            value={currency}
                            onChange={(event) => setCurrency(event.target.value)}
                            className={inputClass}
                            required
                        >
                            {!currencyOptions.includes(currency) && currency && (
                                <option value={currency}>{currency}</option>
                            )}
                            {currencyOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </SettingsField>
                    <SettingsField
                        id="settings-phone"
                        label="Teléfono"
                        description="Número de teléfono principal que los clientes pueden utilizar para contactar al negocio."
                    >
                        <input
                            id="settings-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(onlyDigits(event.target.value))}
                            className={inputClass}
                            placeholder="Opcional"
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            minLength={10}
                            maxLength={10}
                            autoComplete="tel"
                        />
                    </SettingsField>
                    <SettingsField
                        id="settings-whatsapp"
                        label="WhatsApp"
                        description="Número de WhatsApp que los clientes pueden utilizar para comunicarse con el negocio."
                    >
                        <input
                            id="settings-whatsapp"
                            type="tel"
                            value={whatsapp}
                            onChange={(event) => setWhatsapp(onlyDigits(event.target.value))}
                            className={inputClass}
                            placeholder="Opcional"
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            minLength={10}
                            maxLength={10}
                            autoComplete="tel"
                        />
                    </SettingsField>
                    <SettingsField
                        id="settings-timezone"
                        label="Zona horaria"
                        description="Define la zona horaria utilizada para fechas, horarios y estadísticas del negocio."
                    >
                        <select
                            id="settings-timezone"
                            value={timezone}
                            onChange={(event) => setTimezone(event.target.value)}
                            className={inputClass}
                        >
                            {!timezoneOptions.includes(timezone) && (
                                <option value={timezone}>{timezone}</option>
                            )}
                            {timezoneOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </SettingsField>
                    {validationError && (
                        <p className="text-sm text-[#B42318]" role="alert">
                            {validationError}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={isSaving}
                        aria-busy={isSaving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgb(30_64_175_/_0.18)] transition hover:-translate-y-0.5 hover:bg-[#183991] disabled:cursor-wait disabled:opacity-60"
                    >
                        {isSaving ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        {isSaving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </form>
            )}
        </Modal>
    )
}

function SettingsField({
    id,
    label,
    description,
    children,
}: {
    id: string
    label: string
    description: string
    children: React.ReactNode
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-[#243556]">
                {label}
            </label>
            <p className={descriptionClass}>{description}</p>
            <div className="mt-2">{children}</div>
        </div>
    )
}
