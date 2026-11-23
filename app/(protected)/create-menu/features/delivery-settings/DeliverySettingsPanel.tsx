'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bike, MapPin, Plus, X } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { LocationPickerModal } from '../business-location/LocationPickerModal'
import {
    deliverySettingsQueryKey,
    getDeliverySettings,
    saveDeliverySettings,
    type DeliveryCoordinates,
    type DeliverySettings,
} from './deliverySettingsApi'
import {
    DELIVERY_LIMITS,
    deliveryIssueMessages,
    isKnownDeliveryIssue,
    newTier,
    toFormState,
    toSavePayload,
    validateDeliveryForm,
    type DeliveryFormState,
    type DeliveryIssue,
} from './deliverySettingsForm'

const DeliveryAreaMap = dynamic(
    () => import('./DeliveryAreaMap').then((module) => module.DeliveryAreaMap),
    {
        ssr: false,
        loading: () => (
            <div className="grid h-44 place-items-center bg-[#F3F6FB] text-sm text-[#8996A9] sm:h-56">
                Cargando mapa…
            </div>
        ),
    },
)

const sectionClass = 'mt-5 rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6'
const inputClass =
    'mt-1 w-full rounded-xl border border-[#D7E1EF] px-3 py-3 text-sm text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'
const secondaryButtonClass =
    'inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E1EF] px-3 py-2 text-sm font-bold text-[#243556] transition hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-50'

type DeliverySettingsPanelProps = {
    /** Dirección escrita del negocio, para el buscador del selector de ubicación. */
    locationText?: string
    /** Avisa al perfil del negocio que la ubicación cambió (es la misma ubicación). */
    onOriginSaved?: (origin: DeliveryCoordinates) => void
}

export function DeliverySettingsPanel({ locationText, onOriginSaved }: DeliverySettingsPanelProps) {
    const query = useQuery({ queryKey: deliverySettingsQueryKey, queryFn: getDeliverySettings })

    if (query.isError) {
        return (
            <section data-cy="delivery-settings" className={sectionClass}>
                <p
                    data-cy="delivery-settings-load-error"
                    role="alert"
                    className="text-sm font-semibold text-[#B42318]"
                >
                    No pudimos cargar la configuración de envío a domicilio.
                </p>
                <button
                    type="button"
                    data-cy="delivery-settings-retry"
                    onClick={() => void query.refetch()}
                    className={`${secondaryButtonClass} mt-3`}
                >
                    Reintentar
                </button>
            </section>
        )
    }
    if (!query.data) return <DeliverySettingsSkeleton />

    return (
        <DeliverySettingsForm
            saved={query.data.deliverySettings}
            locationText={locationText}
            onOriginSaved={onOriginSaved}
        />
    )
}

function DeliverySettingsForm({
    saved,
    locationText,
    onOriginSaved,
}: {
    saved: DeliverySettings
    locationText?: string
    onOriginSaved?: (origin: DeliveryCoordinates) => void
}) {
    const client = useQueryClient()
    const [form, setForm] = useState<DeliveryFormState>(() => toFormState(saved))
    const [showErrors, setShowErrors] = useState(false)
    const [serverIssues, setServerIssues] = useState<DeliveryIssue[]>([])
    const [justSaved, setJustSaved] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)

    const save = useMutation({
        mutationFn: saveDeliverySettings,
        onSuccess: (data, input) => {
            client.setQueryData(deliverySettingsQueryKey, data)
            setForm(toFormState(data.deliverySettings))
            setShowErrors(false)
            setServerIssues([])
            setJustSaved(true)
            if (input.origin && data.deliverySettings.origin) {
                onOriginSaved?.(data.deliverySettings.origin)
            }
        },
        onError: (error) => {
            const details =
                error instanceof ApiError
                    ? (error.details as { issues?: unknown } | undefined)
                    : undefined
            const issues = Array.isArray(details?.issues)
                ? details.issues.filter(isKnownDeliveryIssue)
                : []
            setServerIssues(issues)
        },
    })

    const issues = validateDeliveryForm(form)
    const visibleIssues = showErrors ? [...new Set([...issues, ...serverIssues])] : serverIssues
    const maxKm = Number(form.maxDeliveryKm.replace(',', '.'))
    const straightRadiusKm =
        Number.isFinite(maxKm) && maxKm > 0 && maxKm <= DELIVERY_LIMITS.maxKm
            ? maxKm / saved.routeFactor
            : null

    function update(patch: Partial<DeliveryFormState>) {
        setForm((current) => ({ ...current, ...patch }))
        setJustSaved(false)
        setServerIssues([])
        save.reset()
    }

    function updateTier(key: string, patch: { upToKm?: string; fee?: string }) {
        update({
            tiers: form.tiers.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)),
        })
    }

    function submit(event: React.FormEvent) {
        event.preventDefault()
        setShowErrors(true)
        if (issues.length > 0) return
        save.mutate(toSavePayload(form))
    }

    return (
        <section
            data-cy="delivery-settings"
            aria-labelledby="delivery-settings-title"
            className={sectionClass}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2
                        id="delivery-settings-title"
                        className="flex items-center gap-2 text-base font-bold text-[#12234A]"
                    >
                        <Bike aria-hidden="true" className="size-5 text-[#2451C5]" /> Envío a
                        domicilio
                    </h2>
                    <p className="mt-1 text-sm text-[#65738A]">
                        El envío se calcula por distancia y es 100% para el repartidor.
                    </p>
                </div>
                <span
                    data-cy="delivery-status"
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${saved.enabled ? 'bg-[#EAF8EF] text-[#16803D]' : 'bg-[#F1F4F9] text-[#53647D]'}`}
                >
                    {saved.enabled ? 'Activo' : 'Inactivo'}
                </span>
            </div>

            <form className="mt-5 grid gap-6" onSubmit={submit} noValidate>
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#D7E1EF] px-4 py-3">
                    <span>
                        <span className="block text-sm font-bold text-[#243556]">
                            Recibir pedidos a domicilio
                        </span>
                        <span className="block text-xs text-[#8996A9]">
                            Tus clientes verán la opción “A domicilio” al pedir.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        role="switch"
                        data-cy="delivery-enabled-toggle"
                        checked={form.enabled}
                        onChange={(event) => update({ enabled: event.target.checked })}
                        className="peer sr-only"
                    />
                    <span
                        aria-hidden="true"
                        className="relative h-7 w-12 shrink-0 rounded-full bg-[#CBD5E1] transition peer-checked:bg-[#1E40AF] peer-focus-visible:ring-4 peer-focus-visible:ring-[#2451C5]/20 after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
                    />
                </label>

                <div>
                    <p className="text-sm font-bold text-[#243556]">Punto de salida</p>
                    {form.origin ? (
                        <div className="mt-2">
                            <div
                                data-cy="delivery-origin-map"
                                // isolate: los z-index de Leaflet (hasta 1000) no salen del mapa
                                // ni quedan encima de la navegación fija en móvil.
                                className="isolate overflow-hidden rounded-xl border border-[#DCE5F3]"
                            >
                                <DeliveryAreaMap
                                    origin={form.origin}
                                    straightRadiusKm={straightRadiusKm}
                                />
                            </div>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-[#8996A9]">
                                    Es la ubicación de tu negocio. El círculo es el área aproximada
                                    en línea recta; la distancia se calcula por calles.
                                </p>
                                <button
                                    type="button"
                                    data-cy="delivery-origin-edit"
                                    onClick={() => setPickerOpen(true)}
                                    className={`${secondaryButtonClass} shrink-0 self-start`}
                                >
                                    <MapPin aria-hidden="true" className="size-4" /> Cambiar
                                    ubicación
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            data-cy="delivery-origin-empty"
                            className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-[#C9D5EA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <p className="text-sm text-[#53647D]">
                                Marca la ubicación de tu restaurante para calcular la distancia a
                                cada cliente.
                            </p>
                            <button
                                type="button"
                                data-cy="delivery-origin-edit"
                                onClick={() => setPickerOpen(true)}
                                className={`${secondaryButtonClass} shrink-0 self-start`}
                            >
                                <MapPin aria-hidden="true" className="size-4" /> Marcar ubicación
                            </button>
                        </div>
                    )}
                </div>

                <label className="block max-w-xs text-sm font-bold text-[#243556]">
                    Radio máximo
                    <span className="relative block">
                        <input
                            data-cy="delivery-max-km-input"
                            value={form.maxDeliveryKm}
                            onChange={(event) => update({ maxDeliveryKm: event.target.value })}
                            inputMode="decimal"
                            placeholder="0.0"
                            className={`${inputClass} pr-12`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm font-semibold text-[#8996A9]">
                            km
                        </span>
                    </span>
                    <span className="mt-1 block text-xs font-normal text-[#8996A9]">
                        Más lejos de esta distancia no se aceptan pedidos a domicilio.
                    </span>
                </label>

                <fieldset>
                    <legend className="text-sm font-bold text-[#243556]">
                        Tarifa por distancia
                    </legend>
                    <p className="mt-1 text-xs text-[#8996A9]">
                        Cada tramo incluye su límite: un pedido a 2 km paga el tramo “hasta 2 km”.
                    </p>
                    <ol className="mt-3 grid gap-2">
                        {form.tiers.map((tier, index) => (
                            <li
                                key={tier.key}
                                data-cy="delivery-tier-row"
                                className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                            >
                                <label className="text-xs font-semibold text-[#53647D]">
                                    Hasta (km)
                                    <input
                                        data-cy="delivery-tier-km"
                                        aria-label={`Tramo ${index + 1}: hasta cuántos km`}
                                        value={tier.upToKm}
                                        onChange={(event) =>
                                            updateTier(tier.key, { upToKm: event.target.value })
                                        }
                                        inputMode="decimal"
                                        placeholder="0.0"
                                        className={inputClass}
                                    />
                                </label>
                                <label className="text-xs font-semibold text-[#53647D]">
                                    Envío ($)
                                    <input
                                        data-cy="delivery-tier-fee"
                                        aria-label={`Tramo ${index + 1}: envío en pesos`}
                                        value={tier.fee}
                                        onChange={(event) =>
                                            updateTier(tier.key, { fee: event.target.value })
                                        }
                                        inputMode="decimal"
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </label>
                                <button
                                    type="button"
                                    data-cy="delivery-tier-remove"
                                    aria-label={`Quitar tramo ${index + 1}`}
                                    disabled={form.tiers.length === 1}
                                    onClick={() =>
                                        update({
                                            tiers: form.tiers.filter(
                                                (item) => item.key !== tier.key,
                                            ),
                                        })
                                    }
                                    className="grid size-11 place-items-center rounded-xl text-[#8996A9] transition hover:bg-[#FFF3F1] hover:text-[#B42318] disabled:invisible"
                                >
                                    <X aria-hidden="true" className="size-4" />
                                </button>
                            </li>
                        ))}
                    </ol>
                    <button
                        type="button"
                        data-cy="delivery-tier-add"
                        disabled={form.tiers.length >= DELIVERY_LIMITS.maxTiers}
                        onClick={() => update({ tiers: [...form.tiers, newTier()] })}
                        className={`${secondaryButtonClass} mt-3`}
                    >
                        <Plus aria-hidden="true" className="size-4" /> Agregar tramo
                    </button>
                </fieldset>

                {visibleIssues.length > 0 && (
                    <ul
                        data-cy="delivery-settings-errors"
                        role="alert"
                        className="grid gap-1 text-sm text-[#B42318]"
                    >
                        {visibleIssues.map((issue) => (
                            <li key={issue} data-cy={`delivery-issue-${issue}`}>
                                {deliveryIssueMessages[issue]}
                            </li>
                        ))}
                    </ul>
                )}
                {save.isError && serverIssues.length === 0 && (
                    <p
                        data-cy="delivery-settings-error"
                        role="alert"
                        className="text-sm text-[#B42318]"
                    >
                        No pudimos guardar el envío. Inténtalo de nuevo.
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        data-cy="delivery-settings-save"
                        type="submit"
                        disabled={save.isPending}
                        className="min-h-11 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#19368F] disabled:cursor-wait disabled:opacity-60"
                    >
                        {save.isPending ? 'Guardando…' : 'Guardar envío'}
                    </button>
                    {justSaved && (
                        <p
                            data-cy="delivery-settings-saved"
                            role="status"
                            className="text-sm font-semibold text-[#16803D]"
                        >
                            Envío guardado.
                        </p>
                    )}
                </div>
            </form>

            <LocationPickerModal
                open={pickerOpen}
                locationText={locationText ?? ''}
                coordinates={form.origin}
                saveHint="La ubicación se guarda al tocar “Guardar envío”."
                onClose={() => setPickerOpen(false)}
                onSave={(origin) => {
                    update({ origin, originChanged: true })
                    setPickerOpen(false)
                }}
            />
        </section>
    )
}

export function DeliverySettingsSkeleton() {
    return (
        <section data-cy="delivery-settings" className={sectionClass}>
            <div
                data-cy="delivery-settings-skeleton"
                className="animate-pulse space-y-3 motion-reduce:animate-none"
            >
                <div className="h-5 w-48 rounded bg-[#E8EEF6]" />
                <div className="h-4 w-72 max-w-full rounded bg-[#F1F4F9]" />
                <div className="h-14 rounded-xl bg-[#F1F4F9]" />
                <div className="h-44 rounded-xl bg-[#F1F4F9]" />
            </div>
        </section>
    )
}
